import { effectScope, nextTick, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorldPresence } from '../src/hooks/useWorldPresence';

const calls = vi.hoisted(() => ({ load: vi.fn(), visit: vi.fn() }));
vi.mock('../src/services/api/worldPresence', () => ({ loadPresence: calls.load, visitNode: calls.visit }));
const scopes: ReturnType<typeof effectScope>[] = [];
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); await nextTick(); };
const state = (node: number | null, revision = 1) => ({ enabled: true, current: { node_id: node, revision }, counts: node ? { [node]: 1 } : {} });
function setup(options: { enter?: boolean } = {}) {
  const scope = effectScope(); scopes.push(scope); const node = ref<number | null>(83), session = ref(1);
  return { node, session, result: scope.run(() => useWorldPresence(node, session, options))! };
}
beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); vi.stubGlobal('document', { visibilityState: 'visible' }); });
afterEach(() => { scopes.splice(0).forEach(s => s.stop()); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('character presence lifecycle', () => {
  it('keeps presence while crafting or storing at the current location without moving', async () => {
    calls.load.mockResolvedValue(state(83, 3)); calls.visit.mockResolvedValue({ node_id: 83, revision: 3 });
    setup({ enter: false }); await flush();
    expect(calls.visit.mock.calls[0].slice(0, 3)).toEqual([83, 3, true]);
    await vi.advanceTimersByTimeAsync(30000);
    expect(calls.visit.mock.calls[1].slice(0, 3)).toEqual([83, 3, true]);
  });
  it('does not move when opening a remote workspace or storage', async () => {
    calls.load.mockResolvedValue(state(58, 3));
    setup({ enter: false }); await flush(); await vi.advanceTimersByTimeAsync(60000);
    expect(calls.visit).not.toHaveBeenCalled();
  });
  it('retries entry after an initial read fails', async () => {
    calls.load.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(state(58, 3));
    calls.visit.mockResolvedValue({ node_id: 83, revision: 4 });
    setup(); await flush(); expect(calls.visit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30000);
    expect(calls.visit.mock.calls[0].slice(0, 3)).toEqual([83, 3, false]);
  });
  it('does not repeat an entry when the movement response is lost', async () => {
    calls.load.mockResolvedValue(state(58, 3)); calls.visit.mockRejectedValue(new Error('connection lost'));
    setup(); await flush();
    await vi.advanceTimersByTimeAsync(60000);
    expect(calls.visit).toHaveBeenCalledTimes(1);
  });
  it('moves once on entry and uses a heartbeat for subsequent refreshes', async () => {
    calls.load.mockResolvedValue(state(83)); calls.visit.mockResolvedValue({ node_id: 83, revision: 2 });
    setup(); await flush();
    expect(calls.visit.mock.calls[0].slice(0, 3)).toEqual([83, 1, false]);
    await vi.advanceTimersByTimeAsync(30000);
    expect(calls.visit.mock.calls[1].slice(0, 3)).toEqual([83, 1, true]);
  });
  it('does not pull a character back after another tab moves it', async () => {
    calls.load.mockResolvedValue(state(83)); calls.visit.mockResolvedValue({ node_id: 83, revision: 2 });
    const { result } = setup(); await flush(); calls.load.mockResolvedValue(state(58, 3));
    await vi.advanceTimersByTimeAsync(60000);
    expect(calls.visit).toHaveBeenCalledTimes(1); expect(result.current.value?.node_id).toBe(58);
  });
  it('ignores delayed movement from an old session', async () => {
    calls.load.mockResolvedValue(state(null, 0)); let resolve: (value: unknown) => void = () => {};
    calls.visit.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const { session, result } = setup(); await flush();
    calls.load.mockResolvedValue(state(58, 4)); calls.visit.mockResolvedValue({ node_id: 83, revision: 5 });
    session.value++; await flush(); resolve({ node_id: 999, revision: 1 }); await flush();
    expect(result.current.value?.node_id).not.toBe(999);
  });
  it('lets the lease expire while hidden and cancels polling on disposal', async () => {
    calls.load.mockResolvedValue(state(83)); calls.visit.mockResolvedValue({ node_id: 83, revision: 2 });
    setup(); await flush(); vi.stubGlobal('document', { visibilityState: 'hidden' });
    await vi.advanceTimersByTimeAsync(120000); expect(calls.visit).toHaveBeenCalledTimes(1);
    scopes[0].stop(); expect(vi.getTimerCount()).toBe(0);
  });
});

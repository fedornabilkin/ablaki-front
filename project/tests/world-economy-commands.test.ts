import { effectScope, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSimpleWorldCommand } from '../src/hooks/useSimpleWorldCommand';
import { useWorldCommand } from '../src/hooks/useWorldCommand';
import { isWorldCommandPath } from '../src/services/api/world';
import { parseEconomyStorage } from '../src/services/api/worldEconomyStorage';
const calls = vi.hoisted(() => ({ simple: vi.fn(), quoted: vi.fn() }));
vi.mock('../src/services/api/simpleWorld', () => ({ command: calls.simple }));
vi.mock('../src/services/api/world', async original => ({ ...await original<typeof import('../src/services/api/world')>(), sendWorldCommand: calls.quoted }));
const scopes: ReturnType<typeof effectScope>[] = [];
function scope<T>(callback: () => T): T { const owner = effectScope(); scopes.push(owner); return owner.run(callback)!; }
beforeEach(() => {
  vi.clearAllMocks(); const values = new Map<string, string>();
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
});
afterEach(() => { scopes.splice(0).forEach(scope => scope.stop()); vi.unstubAllGlobals(); });
describe('new economy command recovery', () => {
  it.each([['economy/food', { code: 'world-cooked-carrot', health_revision: 1 }], ['economy/goals/claim', { code: 'day-1' }]])('restores %s with its original immutable key after a lost response', async (path, body) => {
    calls.simple.mockRejectedValueOnce(new Error('offline'));
    const first = scope(() => useSimpleWorldCommand(ref('11.mvp'), ref(1)));
    await first.submit(path, body);
    expect(first.pending.value?.path).toBe(path);
    const restored = scope(() => useSimpleWorldCommand(ref('11.mvp'), ref(1)));
    expect(restored.pending.value).toEqual(first.pending.value);
    calls.simple.mockResolvedValueOnce({ operation_id: 'a'.repeat(32) });
    await restored.retry();
    expect(calls.simple.mock.calls[1]).toEqual(calls.simple.mock.calls[0]);
    expect(restored.pending.value).toBeNull();
  });
  it('restores an accepted storage expansion without recalculating the price', async () => {
    const path = '/economy/storage/7/expand', quote = { quote_id: 'a'.repeat(32), expected_revisions: { 'storage:7': 1 }, terms: { price_cr: '90.0000' }, expires_at: 1000, server_time: 1 };
    expect(isWorldCommandPath(path)).toBe(true);
    expect(isWorldCommandPath('/economy/storage/0/expand')).toBe(false);
    calls.quoted.mockRejectedValueOnce(new Error('offline'));
    const first = scope(() => useWorldCommand(ref(1), ref(11), vi.fn()));
    await first.submit(path, { code: 'backpack-10' }, quote);
    const restored = scope(() => useWorldCommand(ref(1), ref(11), vi.fn()));
    expect(restored.pending.value).toEqual(first.pending.value);
    calls.quoted.mockImplementationOnce((_path, body) => Promise.resolve({ request_key: body.request_key, changed_storage_ids: [7] }));
    await restored.retry();
    expect(calls.quoted.mock.calls[1]).toEqual(calls.quoted.mock.calls[0]);
    expect(restored.pending.value).toBeNull();
  });
  it('validates the purchased capacity increase before offering a package', () => {
    const value = { storage_id: 1, capacity: 20, writable: true, options: [{ code: 'backpack-10', slots: 10, capacity_after: 30, price_cr: '90.0000' }] };
    expect(parseEconomyStorage(value).options[0]).toEqual({ code: 'backpack-10', slots: 10, after: 30, price: '90.0000' });
    expect(() => parseEconomyStorage({ ...value, options: [{ ...value.options[0], capacity_after: 29 }] })).toThrow();
  });
});

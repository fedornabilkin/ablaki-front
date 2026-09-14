import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFiveGame } from '../src/hooks/useFiveGame';
const api = vi.hoisted(() => ({ loadFive: vi.fn(), createFive: vi.fn(), moveFive: vi.fn(), cancelFive: vi.fn(), fiveFinished: (game: any) => ['user', 'gamer'].includes(game.status) }));
vi.mock('../src/services/api/fiveGame', () => api);
const game: any = { id: 1, status: 'play', turn: 'gamer', last_hod: { id: 7 } };
let scope: EffectScope;
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); scope = effectScope(); api.loadFive.mockResolvedValue(game); });
afterEach(() => { scope.stop(); vi.useRealTimers(); });
const flush = async () => { await Promise.resolve(); await nextTick(); await Promise.resolve(); };
describe('live five game state', () => {
  it('polls opponent moves, refreshes the account at completion and stops polling', async () => {
    const account = vi.fn().mockResolvedValue(null); const changed = vi.fn().mockResolvedValue(null);
    const state = scope.run(() => useFiveGame(ref(1), account, changed))!;
    state.open(game); await flush();
    api.loadFive.mockResolvedValueOnce({ ...game, status: 'user', turn: null });
    await vi.advanceTimersByTimeAsync(5000);
    expect(state.game.value?.status).toBe('user'); expect(account).toHaveBeenCalledOnce(); expect(changed).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(15000); expect(api.loadFive).toHaveBeenCalledTimes(2);
  });
  it('locks duplicate commands, ignores an old poll and refreshes account after a move', async () => {
    let poll!: (data: any) => void; let move!: (data: any) => void;
    api.loadFive.mockImplementationOnce(() => new Promise(resolve => { poll = resolve; }));
    api.moveFive.mockImplementationOnce(() => new Promise(resolve => { move = resolve; }));
    const account = vi.fn().mockResolvedValue(null);
    const state = scope.run(() => useFiveGame(ref(1), account, vi.fn().mockResolvedValue(null)))!;
    state.open(game); const command = state.move(3); await state.move(3);
    expect(api.moveFive).toHaveBeenCalledOnce();
    move({ ...game, turn: 'user' }); await command;
    poll(game); await flush();
    expect(state.game.value?.turn).toBe('user'); expect(account).toHaveBeenCalledOnce(); expect(state.busy.value).toBe(false);
  });
  it('discards a pending operation after session change and allows the new session to work', async () => {
    let finish!: (data: any) => void;
    api.createFive.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const session = ref(1); const account = vi.fn();
    const state = scope.run(() => useFiveGame(session, account, vi.fn()))!;
    const command = state.create(10, 3); session.value++; await flush(); finish(game); await command;
    expect(state.game.value).toBeNull(); expect(state.busy.value).toBe(false); expect(account).not.toHaveBeenCalled();
  });
  it('shows errors, releases controls and cancels polling after closing', async () => {
    const state = scope.run(() => useFiveGame(ref(1), vi.fn().mockResolvedValue(null), vi.fn().mockResolvedValue(null)))!;
    state.open(game); await flush(); api.moveFive.mockRejectedValueOnce(new Error('offline')); await state.move(3);
    expect(state.error.value).not.toBe(''); expect(state.busy.value).toBe(false);
    state.close(); await vi.advanceTimersByTimeAsync(10000); expect(api.loadFive).toHaveBeenCalledOnce();
  });
  it('refreshes the account on cancellation and does not repeat successful commands when the profile fails', async () => {
    const state = scope.run(() => useFiveGame(ref(1), vi.fn().mockRejectedValue(new Error('profile offline')), vi.fn().mockResolvedValue(null)))!;
    state.open(game); await flush(); api.cancelFive.mockResolvedValueOnce(undefined); await state.cancel();
    expect(api.cancelFive).toHaveBeenCalledOnce(); expect(state.game.value).toBeNull(); expect(state.notice.value).toContain('обновить счёт');
  });
});

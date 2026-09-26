import { effectScope, ref } from 'vue';
import { expect, it, vi } from 'vitest';
import { useQuickGames } from '../src/hooks/useQuickGames';
const deferred = () => { let resolve!: (value: unknown) => void, reject!: (value: unknown) => void; const promise = new Promise((ok, fail) => {resolve = ok; reject = fail;}); return {promise, resolve, reject}; };
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
it('accepts all visible rows concurrently, keeps each result and refreshes account after the batch', async () => {
  const scope = effectScope(), calls = Array.from({length: 20}, deferred), refresh = vi.fn().mockResolvedValue(null);
  const play = vi.fn((id: number) => calls[id - 1].promise);
  const games = scope.run(() => useQuickGames(ref(1), play, refresh))!;
  for (let id = 1; id <= 20; id++) void games.submit(id, 1);
  await games.submit(1, 2); expect(play).toHaveBeenCalledTimes(20);
  expect(Object.values(games.rows.value).every(row => row.result === 'pending')).toBe(true);
  for (let id = 20; id > 1; id--) calls[id - 1].resolve({game: {win: id % 2 === 0}});
  await flush(); expect(refresh).not.toHaveBeenCalled(); expect(games.rows.value[20].result).toBe('win'); expect(games.rows.value[19].result).toBe('loss');
  calls[0].resolve({game: {win: false}}); await flush();
  expect(games.pending.value).toBe(false); expect(refresh).toHaveBeenCalledOnce();
  scope.stop();
});
it('isolates failures and ignores old requests after account changes', async () => {
  const scope = effectScope(), session = ref(1), first = deferred(), second = deferred(), refresh = vi.fn();
  const play = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const games = scope.run(() => useQuickGames(session, play, refresh))!;
  void games.submit(1, 1); void games.submit(2, 2); first.reject(new Error('offline')); await flush();
  expect(games.rows.value[1].result).toBe('error'); expect(games.rows.value[2].result).toBe('pending');
  session.value = 2; second.resolve({game: {win: true}}); await flush();
  expect(games.rows.value).toEqual({}); expect(refresh).not.toHaveBeenCalled(); scope.stop();
});

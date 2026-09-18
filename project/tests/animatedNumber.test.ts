import { effectScope, nextTick, ref } from 'vue';
import { afterEach, expect, it, vi } from 'vitest';
import { useAnimatedNumber } from '../src/hooks/useAnimatedNumber';
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function frames(reduced = false) {
  const pending = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.stubGlobal('window', { matchMedia: () => ({ matches: reduced }) });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { pending.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (key: number) => pending.delete(key));
  vi.spyOn(performance, 'now').mockReturnValue(0);
  return { pending, tick(now: number) { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(now)); } };
}
it('animates balance changes and finishes on the exact server value', async () => {
  const clock = frames(), scope = effectScope(), value = ref<unknown>(10), owner = ref(1);
  const state = scope.run(() => useAnimatedNumber(() => value.value, owner))!;
  value.value = 20; await nextTick();
  expect(state.direction.value).toBe('increased');
  clock.tick(325); expect(state.displayed.value).toBeGreaterThan(10); expect(state.displayed.value).toBeLessThan(20);
  clock.tick(650); expect(state.displayed.value).toBe(20); expect(clock.pending.size).toBe(0);
  value.value = 5; await nextTick(); expect(state.direction.value).toBe('decreased');
  owner.value = 2; value.value = 100; await nextTick();
  expect(state.displayed.value).toBe(100); expect(clock.pending.size).toBe(0);
  value.value = 101; await nextTick(); scope.stop(); expect(clock.pending.size).toBe(0);
});
it('respects reduced motion and never turns missing values into zero', async () => {
  const clock = frames(true), scope = effectScope(), value = ref<unknown>(3);
  const state = scope.run(() => useAnimatedNumber(() => value.value, () => 1))!;
  value.value = 7; await nextTick(); expect(state.displayed.value).toBe(7); expect(clock.pending.size).toBe(0);
  value.value = null; await nextTick(); expect(state.displayed.value).toBeNull();
  scope.stop();
});

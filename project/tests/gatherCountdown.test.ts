import { effectScope, ref, nextTick } from 'vue';
import { describe, it, expect, vi } from 'vitest';
import { useGatherCountdown } from '../src/hooks/useGatherCountdown';
import type { CraftState } from '../src/services/api/classicCraft';

describe('gather countdown', () => {
  it('uses server time, refreshes at midnight once and cancels on session reset', async () => {
    vi.useFakeTimers();
    const scope = effectScope(), refresh = vi.fn().mockResolvedValue(undefined);
    const state = ref({gather_available: false, server_time: 1000, gather_available_at: 1002} as CraftState | null);
    try {
      const text = scope.run(() => useGatherCountdown(state, refresh))!;
      expect(text.value).toBe('00:00:02');
      await vi.advanceTimersByTimeAsync(1000); expect(text.value).toBe('00:00:01');
      await vi.advanceTimersByTimeAsync(4000); expect(refresh).toHaveBeenCalledTimes(1);
      state.value = {gather_available: false, server_time: 1000, gather_available_at: 4600} as CraftState;
      await nextTick(); expect(text.value).toBe('01:00:00');
      state.value = null; await nextTick();
      await vi.advanceTimersByTimeAsync(3600000); expect(refresh).toHaveBeenCalledTimes(1);
    } finally { scope.stop(); vi.useRealTimers(); }
  });
});

import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';
import type { CraftState } from '@/services/api/classicCraft';

export function useGatherCountdown(state: Ref<CraftState | null>, refresh: () => Promise<unknown>) {
  const remaining = ref(0);
  let timer: ReturnType<typeof setInterval> | undefined;
  watch(state, value => {
    clearInterval(timer);
    remaining.value = 0;
    if (!value || value.gather_available || !value.gather_available_at || !value.server_time) return;
    const deadline = Date.now() + Math.max(0, value.gather_available_at - value.server_time) * 1000;
    const tick = () => {
      remaining.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (!remaining.value) { clearInterval(timer); void refresh(); }
    };
    timer = setInterval(tick, 1000);
    tick();
  }, { immediate: true });
  onScopeDispose(() => clearInterval(timer));
  return computed(() => [Math.floor(remaining.value / 3600), Math.floor(remaining.value / 60) % 60, remaining.value % 60].map(n => String(n).padStart(2, '0')).join(':'));
}

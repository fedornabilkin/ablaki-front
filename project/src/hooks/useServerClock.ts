import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';
/** Monotonic elapsed time avoids changing a countdown when the device clock is corrected. */
export function useServerClock(serverTime: Ref<number | undefined>) {
  const elapsed = ref(0); let received = performance.now(), fallback = Math.floor(Date.now() / 1000);
  watch(serverTime, () => { received = performance.now(); fallback = Math.floor(Date.now() / 1000); elapsed.value = 0; }, { immediate: true });
  const timer = setInterval(() => { elapsed.value = Math.floor((performance.now() - received) / 1000); }, 1000);
  onScopeDispose(() => clearInterval(timer));
  return computed(() => (serverTime.value ?? fallback) + elapsed.value);
}

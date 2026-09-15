import { onScopeDispose, ref, watch, type WatchSource } from 'vue';
const numeric = (value: unknown): number | null => (typeof value === 'number' || typeof value === 'string') && String(value).trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : null;

export function useAnimatedNumber(value: () => unknown, identity: WatchSource<unknown>) {
  const displayed = ref(numeric(value()));
  const direction = ref('');
  let frame: number | undefined;
  function stop() { if (frame !== undefined) cancelAnimationFrame(frame); frame = undefined; direction.value = ''; }
  watch([value, identity], ([next, owner], [, previousOwner]) => {
    stop();
    const target = numeric(next), start = displayed.value;
    if (target === null || start === null || target === start || owner !== previousOwner || typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      displayed.value = target; return;
    }
    direction.value = target > start ? 'increased' : 'decreased';
    const began = performance.now();
    function tick(now: number) {
      const progress = Math.min(1, Math.max(0, (now - began) / 650));
      displayed.value = start! + (target! - start!) * (1 - Math.pow(1 - progress, 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else { displayed.value = target; stop(); }
    }
    frame = requestAnimationFrame(tick);
  });
  onScopeDispose(stop);
  return { displayed, direction };
}

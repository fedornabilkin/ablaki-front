import { onScopeDispose, ref } from 'vue';

/** Animation may stay local; background network work must opt into a visible page. */
export function usePageVisibility() {
  const visible = ref(typeof document === 'undefined' || document.visibilityState !== 'hidden');
  const update = () => { visible.value = document.visibilityState !== 'hidden'; };
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', update);
    onScopeDispose(() => document.removeEventListener('visibilitychange', update));
  }
  return visible;
}

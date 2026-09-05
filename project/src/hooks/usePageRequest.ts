import { onScopeDispose, ref, shallowRef, watch, type WatchSource } from 'vue';
import { errorText } from '@/services/api/portal';

export function usePageRequest<T>(load: () => Promise<T>, initial: T, sources: WatchSource[] = []) {
  const data = shallowRef<T>(initial);
  const loading = ref(false);
  const error = ref('');
  let revision = 0;
  let disposed = false;
  async function refresh() {
    const current = ++revision;
    loading.value = true;
    error.value = '';
    try {
      const result = await load();
      if (!disposed && current === revision) data.value = result;
    } catch (cause) {
      if (!disposed && current === revision) error.value = errorText(cause);
    } finally {
      if (!disposed && current === revision) loading.value = false;
    }
  }
  if (sources.length) watch(sources, () => { data.value = initial; void refresh(); }, { immediate: true });
  else void refresh();
  onScopeDispose(() => { disposed = true; revision++; });
  return { data, loading, error, refresh };
}

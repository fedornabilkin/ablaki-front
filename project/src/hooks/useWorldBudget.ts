import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { budget } from '@/services/api/simpleWorld';

/** Small, session-scoped read for conditional personal contributions. Commands recheck funds. */
export function useWorldBudget(node: Readonly<Ref<number | null>>, session: Readonly<Ref<number>>, revision?: Readonly<Ref<number>>) {
  const available = ref<string | null>(null);
  const error = ref('');
  let generation = 0;
  async function refresh() {
    const current = ++generation, id = node.value; error.value = '';
    if (id === null) { available.value = null; return; }
    try { const result = await budget(id); if (current === generation) available.value = result.available; }
    catch { if (current === generation) { available.value = null; error.value = 'Не удалось проверить свободный бюджет.'; } }
  }
  watch([node, session], () => { available.value = null; void refresh(); }, { immediate: true, flush: 'sync' });
  if (revision) watch(revision, refresh);
  onScopeDispose(() => { generation++; });
  return { available, error, refresh };
}

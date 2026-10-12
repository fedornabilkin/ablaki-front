import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';
import { startState } from '@/services/api/simpleWorld';
import type { WorldNode } from '@/entities/world/types';

export function useCampsiteCraft(session: Ref<number>, node?: Ref<WorldNode | null | undefined>) {
  const home = ref<number | null>(null);
  let generation = 0;
  watch(session, async () => {
    const current = ++generation; home.value = null;
    try { const value = await startState(); if (current === generation) home.value = value?.id ?? null; }
    catch { /* The home page can still guide the player through joining the world. */ }
  }, { immediate: true });
  onScopeDispose(() => { generation++; });
  return computed(() => {
    const current = node?.value;
    const id = current?.owned_by_me && current.status === 'active' ? current.id : home.value;
    return id ? `/world/workspace/${id}` : '/world';
  });
}

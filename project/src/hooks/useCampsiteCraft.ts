import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';
import { loadWorldHome } from '@/services/api/worldHome';
import { useStore } from 'vuex';
import type { WorldNode } from '@/entities/world/types';

export function useCampsiteCraft(session: Ref<number>, node?: Ref<WorldNode | null | undefined>) {
  const auth = useStore(), owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0));
  const home = ref<number | null>(null);
  let generation = 0;
  watch([session, owner], async () => {
    const current = ++generation; home.value = null;
    if (!owner.value) return;
    try { const value = await loadWorldHome(owner.value, session.value); if (current === generation) home.value = value?.id ?? null; }
    catch { /* The home page can still guide the player through joining the world. */ }
  }, { immediate: true });
  onScopeDispose(() => { generation++; });
  return computed(() => {
    const current = node?.value;
    const id = current?.owned_by_me && current.status === 'active' ? current.id : home.value;
    return id ? `/world/workspace/${id}` : '/world';
  });
}

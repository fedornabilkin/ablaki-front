import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { loadPresence, visitNode, type CharacterLocation } from '@/services/api/worldPresence';

/** Only an explicit navigation moves the character. A stale tab may only refresh its lease. */
export function useWorldPresence(node: Ref<number | null>, session: Ref<number>, options: { enter?: boolean } = {}) {
  const enabled = ref(false), counts = ref<Record<number, number>>({}), current = ref<CharacterLocation | null>(null);
  let generation = 0, controller: AbortController | undefined, timer: ReturnType<typeof setTimeout> | undefined;
  watch([node, session], ([id]) => {
    const token = ++generation; controller?.abort(); clearTimeout(timer);
    controller = new AbortController(); const signal = controller.signal;
    counts.value = {}; current.value = null; enabled.value = false;
    if (!id) return;
    let entering = options.enter !== false;
    async function refresh() {
      if (token !== generation) return;
      if (document.visibilityState === 'hidden') { timer = setTimeout(refresh, 30000); return; }
      try {
        const state = await loadPresence(id!, signal);
        if (token !== generation) return;
        enabled.value = state.enabled; current.value = state.current; counts.value = state.counts;
        if (state.enabled && (entering || state.current.node_id === id)) {
          const heartbeat = !entering;
          // Once sent, a movement may have succeeded even when its response is lost.
          entering = false;
          const moved = await visitNode(id!, state.current.revision, heartbeat, signal);
          if (token !== generation) return;
          current.value = moved;
          const fresh = await loadPresence(id!, signal);
          if (token === generation) { counts.value = fresh.counts; current.value = fresh.current; }
        }
      } catch { /* Retry a failed read, but never repeat an ambiguous movement. */
      } finally { if (token === generation) timer = setTimeout(refresh, 30000); }
    }
    void refresh();
  }, { immediate: true });
  onScopeDispose(() => { generation++; controller?.abort(); clearTimeout(timer); });
  return { enabled, counts, current };
}

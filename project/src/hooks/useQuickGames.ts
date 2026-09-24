import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';
import { errorText } from '@/services/api/portal';

export function useQuickGames(session: Ref<unknown>, play: (id: number, side: number) => Promise<unknown>, settled: () => Promise<void>) {
  const rows = ref<Record<number, { result: 'pending' | 'win' | 'loss' | 'unknown' | 'error'; text: string }>>({});
  const pending = computed(() => Object.values(rows.value).some(row => row.result === 'pending'));
  let generation = 0;
  let disposed = false;
  let updating = false;
  let dirty = false;
  watch(session, () => { generation++; rows.value = {}; dirty = false; }, { flush: 'sync' });
  onScopeDispose(() => { disposed = true; generation++; });
  async function update() {
    if (updating || pending.value || disposed) return;
    updating = true;
    try {
      while (dirty && !pending.value && !disposed) {
        dirty = false;
        try { await settled(); } catch { /* The page owns account refresh errors. */ }
      }
    } finally { updating = false; }
  }
  async function submit(id: number, side: number) {
    if (disposed || ![1, 2].includes(side) || (rows.value[id] && rows.value[id].result !== 'error')) return;
    const current = generation;
    const owner = session.value;
    const isCurrent = () => !disposed && generation === current && session.value === owner;
    rows.value[id] = { result: 'pending', text: 'Ожидание результата' };
    try {
      const response = await play(id, side);
      if (!isCurrent()) return;
      const game = response && typeof response === 'object' && 'game' in response ? response.game : null;
      const win = game && typeof game === 'object' && 'win' in game ? game.win : null;
      rows.value[id] = typeof win === 'boolean'
        ? { result: win ? 'win' : 'loss', text: win ? 'Вы выиграли!' : 'Вы проиграли.' }
        : { result: 'unknown', text: 'Ход отправлен. Проверьте результат в истории игр.' };
    } catch (cause) {
      if (isCurrent()) rows.value[id] = { result: 'error', text: errorText(cause) };
    } finally {
      if (isCurrent()) { dirty = true; void update(); }
    }
  }
  return { rows, pending, submit };
}

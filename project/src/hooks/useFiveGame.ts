import { onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue';
import { cancelFive, createFive, fiveFinished, loadFive, moveFive, type FiveGame } from '@/services/api/fiveGame';
import { errorText } from '@/services/api/portal';

export function useFiveGame(session: Ref<number>, refreshAccount: () => Promise<unknown>, changed: () => Promise<unknown>) {
  const game = shallowRef<FiveGame | null>(null);
  const busy = ref(false);
  const loading = ref(false);
  const error = ref('');
  const notice = ref('');
  let revision = 0;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  function clearTimer() { clearTimeout(timer); timer = undefined; }
  function close() { revision++; clearTimer(); game.value = null; error.value = ''; loading.value = false; busy.value = false; }
  function schedule() {
    clearTimer();
    if (!disposed && game.value && !fiveFinished(game.value)) timer = setTimeout(() => { void refresh(); }, 5000);
  }
  async function refresh() {
    if (!game.value || busy.value) return;
    clearTimer();
    const id = game.value.id;
    const current = ++revision;
    const previous = game.value;
    loading.value = true;
    try {
      const updated = await loadFive(id);
      if (disposed || current !== revision) return;
      game.value = updated; error.value = '';
      if (!fiveFinished(previous) && fiveFinished(updated)) {
        try { await refreshAccount(); } catch { if (current === revision) notice.value = 'Игра завершена. Не удалось обновить счёт — обновите профиль.'; }
        if (current === revision) await changed();
      }
    } catch (cause) { if (!disposed && current === revision) error.value = errorText(cause); }
    finally { if (!disposed && current === revision) { loading.value = false; schedule(); } }
  }
  function open(value: FiveGame) { if (busy.value) return; close(); game.value = value; void refresh(); }
  async function command(load: () => Promise<FiveGame | null>, message: string) {
    if (busy.value) return;
    busy.value = true; loading.value = false; error.value = ''; notice.value = ''; clearTimer();
    const current = ++revision;
    try {
      const updated = await load();
      if (disposed || current !== revision) return;
      game.value = updated; notice.value = message;
      try { await refreshAccount(); }
      catch { if (current === revision) notice.value += ' Не удалось обновить счёт — обновите профиль перед следующей игрой.'; }
      if (!disposed && current === revision) await changed();
    } catch (cause) { if (!disposed && current === revision) error.value = errorText(cause); }
    finally { if (!disposed && current === revision) { busy.value = false; schedule(); } }
  }
  const create = (kon: number, ball: number) => command(() => createFive(kon, ball), 'Игра создана. Ставка зарезервирована.');
  const move = (ball: number) => { const current = game.value; return current ? command(() => moveFive(current, ball), 'Ход принят.') : Promise.resolve(); };
  const cancel = () => { const current = game.value; return current ? command(async () => { await cancelFive(current.id); return null; }, 'Игра отменена. Ставка возвращена.') : Promise.resolve(); };
  watch(session, () => { close(); busy.value = false; notice.value = ''; });
  onScopeDispose(() => { disposed = true; close(); });
  return { game, busy, loading, error, notice, open, close, refresh, create, move, cancel };
}

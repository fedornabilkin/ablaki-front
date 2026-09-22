import { computed, onMounted, onScopeDispose, ref } from 'vue';
import { useStore } from 'vuex';
import { useMessage } from 'naive-ui';
import { claimDaily, errorText } from '@/services/api/portal';
import { dailyAvailability, type DailyAvailability } from '@/services/api/community';
import { usePageRequest } from '@/hooks/usePageRequest';

const rewardChanged = 'ablakin:daily-reward';
export function useDailyRewards() {
  const store = useStore();
  const message = useMessage();
  const session = computed(() => store.state.auth.revision);
  const available = usePageRequest<DailyAvailability>(() => store.getters['auth/isAuthenticated'] ? dailyAvailability() : Promise.resolve({ items: [], refresh_at: 0 }), { items: [], refresh_at: 0 }, [session]);
  const claiming = ref<'bonus' | 'rating' | null>(null);
  let disposed = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  function refresh() { if (!claiming.value && !available.loading.value) void available.refresh(); }
  onMounted(() => {
    window.addEventListener('focus', refresh);
    window.addEventListener(rewardChanged, refresh);
    timer = setInterval(() => { if (available.data.value.refresh_at && Date.now() >= available.data.value.refresh_at * 1000) refresh(); }, 30000);
  });
  onScopeDispose(() => {
    disposed = true; clearInterval(timer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', refresh);
      window.removeEventListener(rewardChanged, refresh);
    }
  });
  async function claim(kind: 'bonus' | 'rating') {
    if (claiming.value || !store.getters['auth/isAuthenticated']) return;
    claiming.value = kind;
    const revision = session.value;
    const current = () => !disposed && revision === session.value;
    try {
      const received = await claimDaily(kind);
      if (!current()) return;
      available.data.value = { ...available.data.value, items: available.data.value.items.filter(item => item.id !== kind) };
      window.dispatchEvent(new Event(rewardChanged));
      message[received ? 'success' : 'info'](received ? 'Ежедневная награда получена.' : 'Эта награда сегодня уже получена.');
      await available.refresh();
      if (!current()) return;
      try { await store.dispatch('auth/fetchData'); }
      catch { if (current()) message.warning('Награда обработана, но счёт не обновился. Обновите профиль.'); }
    } catch (cause) { if (current()) message.error(errorText(cause)); }
    finally { claiming.value = null; }
  }
  return { available, claiming, claim };
}

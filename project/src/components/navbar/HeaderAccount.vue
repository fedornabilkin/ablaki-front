<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue';
import { useStore } from 'vuex';
import { NButton, useMessage } from 'naive-ui';
import { claimDaily, errorText, person } from '@/services/api/portal';
import { formatAccountNumber } from '@/services/api/header';
defineProps<{ compact: boolean }>();
const store = useStore();
const message = useMessage();
const account = computed(() => person(store.getters['auth/user']));
const claiming = ref<'bonus' | 'rating' | null>(null);
let disposed = false;
onScopeDispose(() => { disposed = true; });
async function claim(kind: 'bonus' | 'rating') {
  if (claiming.value || !store.getters['auth/isAuthenticated']) return;
  claiming.value = kind;
  const revision = store.state.auth.revision;
  try {
    const received = await claimDaily(kind);
    if (disposed || revision !== store.state.auth.revision) return;
    message[received ? 'success' : 'info'](received ? 'Ежедневная награда получена.' : 'Эта награда сегодня уже получена.');
    try { await store.dispatch('auth/fetchData'); }
    catch { if (!disposed && revision === store.state.auth.revision) message.warning('Награда обработана, но счёт не обновился. Обновите профиль.'); }
  } catch (cause) {
    if (!disposed && revision === store.state.auth.revision) message.error(errorText(cause));
  } finally { claiming.value = null; }
}
</script>
<template lang="pug">
.account-overview(:class="{ compact }" aria-label="Мой счёт")
  .account-metrics
    router-link.metric-link(to="/balance" :aria-label="'Баланс: ' + formatAccountNumber(account.balance) + ' Кг. История счёта'")
      span.metric-label Баланс
      strong {{ formatAccountNumber(account.balance) }} #[span.unit Кг]
    router-link.metric-link(to="/exchange" :aria-label="'Кредиты: ' + formatAccountNumber(account.credit) + ' Cr. Биржа'")
      span.metric-label Кредиты
      strong {{ formatAccountNumber(account.credit) }} #[span.unit Cr]
    router-link.metric-link(to="/rating" :aria-label="'Рейтинг: ' + formatAccountNumber(account.rating) + '. История рейтинга'")
      span.metric-label Рейтинг
      strong #[font-awesome-icon.metric-star(icon="fa fa-star")] {{ formatAccountNumber(account.rating) }}
  .daily-actions(aria-label="Ежедневные награды")
    n-button(secondary :loading="claiming === 'bonus'" :disabled="claiming !== null" @click="claim('bonus')" aria-label="Получить ежедневный кредит" title="Получить ежедневный кредит")
      template(#icon)
        font-awesome-icon(icon="fa fa-coins")
      | Бонус
    n-button(secondary :loading="claiming === 'rating'" :disabled="claiming !== null" @click="claim('rating')" aria-label="Получить ежедневный рейтинг" title="Получить ежедневный рейтинг")
      template(#icon)
        font-awesome-icon(icon="fa fa-star")
      | Рейтинг
    slot
</template>
<style scoped lang="scss">
.account-overview { display: flex; flex-wrap: wrap; align-items: center; gap: .25rem .75rem; min-width: 0; }
.account-metrics { display: flex; align-items: center; flex-wrap: wrap; gap: .25rem; }
.metric-link { display: grid; align-content: center; min-height: 44px; padding: .25rem .6rem; border-radius: 8px; color: var(--text); }
.metric-link:hover { background: var(--primary-soft); }
.metric-link strong { font-size: .95rem; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.metric-label, .unit { font-size: .7rem; color: var(--text-muted); font-weight: 400; }
.metric-star { color: var(--primary); font-size: .75rem; }
.daily-actions { display: flex; flex-wrap: wrap; gap: .4rem; }
.daily-actions :deep(.n-button) { padding-inline: .6rem; }
.compact .metric-label { display: none; }
@media (max-width: 380px) { .metric-link { padding-inline: .35rem; } }
</style>

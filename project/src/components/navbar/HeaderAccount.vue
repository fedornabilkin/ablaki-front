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
const username = computed(() => store.getters['auth/user']?.username ?? '');
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
  .identity-metrics
    router-link.account-login(to="/users/profile") {{ username }}
    .account-metrics
      router-link.metric-link(to="/rating" title="Рейтинг" :aria-label="'Рейтинг: ' + formatAccountNumber(account.rating) + '. История рейтинга'")
        font-awesome-icon(icon="star" aria-hidden="true")
        strong {{ formatAccountNumber(account.rating) }}
      router-link.metric-link(to="/balance" title="Баланс, Кг" :aria-label="'Баланс: ' + formatAccountNumber(account.balance) + ' Кг. История счёта'")
        font-awesome-icon(icon="cube" aria-hidden="true")
        strong {{ formatAccountNumber(account.balance) }}
      router-link.metric-link(to="/exchange" title="Кредиты, Cr" :aria-label="'Кредиты: ' + formatAccountNumber(account.credit) + ' Cr. Биржа'")
        font-awesome-icon(icon="coins" aria-hidden="true")
        strong {{ formatAccountNumber(account.credit) }}
  .daily-actions(aria-label="Ежедневные награды")
    n-button.bonus-button(secondary :loading="claiming === 'bonus'" :disabled="claiming !== null" @click="claim('bonus')" aria-label="Получить ежедневный кредит" title="Получить ежедневный кредит")
      template(#icon)
        font-awesome-icon(icon="fa fa-coins")
      span.bonus-shine(aria-hidden="true")
      | Бонус
    n-button.bonus-button(secondary :loading="claiming === 'rating'" :disabled="claiming !== null" @click="claim('rating')" aria-label="Получить ежедневный рейтинг" title="Получить ежедневный рейтинг")
      template(#icon)
        font-awesome-icon(icon="fa fa-star")
      span.bonus-shine(aria-hidden="true")
      | Рейтинг
    slot
</template>
<style scoped lang="scss">
.account-overview { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: .25rem .75rem; min-width: 0; width: 100%; }
.identity-metrics { display: flex; align-items: center; flex-wrap: wrap; gap: .25rem .65rem; min-width: 0; }
.account-login { font-weight: 700; overflow-wrap: anywhere; }
.account-metrics { display: flex; align-items: center; flex-wrap: wrap; gap: .25rem; }
.metric-link { display: inline-flex; align-items: center; gap: .35rem; min-height: 2.75rem; padding: .25rem .35rem; border-radius: .5rem; color: var(--primary); }
.metric-link:hover { background: var(--primary-soft); }
.metric-link strong { font-size: .95rem; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.metric-link svg { font-size: .75rem; }
.daily-actions { display: flex; flex-wrap: wrap; gap: .4rem; }
.bonus-button { overflow: hidden; }
.bonus-shine { position: absolute; pointer-events: none; top: -50%; bottom: -50%; left: -80%; width: 45%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent); transform: skewX(-20deg); animation: bonus-shine 6s ease-in-out infinite; }
.bonus-button:nth-child(2) .bonus-shine { animation-delay: 1s; }
@keyframes bonus-shine { 25%, 100% { left: 160%; } }
@media (prefers-reduced-motion: reduce) { .bonus-shine { animation: none; display: none; } }
@media (min-width: 48rem) { .metric-link { padding-inline: .6rem; } }
</style>

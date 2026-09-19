<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { person } from '@/services/api/portal';
import { formatAccountNumber } from '@/services/api/header';
import AnimatedNumber from '@/components/AnimatedNumber.vue';
defineProps<{ compact: boolean }>();
const store = useStore();
const account = computed(() => person(store.getters['auth/user']));
const username = computed(() => store.getters['auth/user']?.username ?? '');
const session = computed(() => store.state.auth.revision);
</script>
<template lang="pug">
.account-overview(:class="{ compact }" aria-label="Мой счёт")
  .identity-metrics
    .account-metrics
      router-link.metric-link(to="/rating" title="Рейтинг" :aria-label="'Рейтинг: ' + formatAccountNumber(account.rating) + '. История рейтинга'")
        font-awesome-icon(icon="star" aria-hidden="true")
        animated-number(:value="account.rating" :identity="session")
      router-link.metric-link(to="/exchange" title="Кредиты, Cr" :aria-label="'Кредиты: ' + formatAccountNumber(account.credit) + ' Cr. Биржа'")
        font-awesome-icon(icon="coins" aria-hidden="true")
        animated-number(:value="account.credit" :identity="session")
      router-link.metric-link(to="/balance" title="Баланс, Кг" :aria-label="'Баланс: ' + formatAccountNumber(account.balance) + ' Кг. История счёта'")
        font-awesome-icon(icon="cube" aria-hidden="true")
        animated-number(:value="account.balance" :identity="session")
    router-link.account-login(to="/users/profile") {{ username }}
</template>
<style scoped lang="scss">
.account-overview { display: flex; justify-content: flex-end; align-items: center; min-width: 0; width: 100%; }
.identity-metrics { display: flex; align-items: center; justify-content: flex-end; flex-wrap: nowrap; gap: .25rem .65rem; min-width: 0; margin-left: auto; }
.account-login { font-weight: 700; text-align: right; white-space: nowrap; flex-shrink: 0; }
.account-metrics { display: flex; align-items: center; justify-content: flex-end; flex-wrap: nowrap; gap: .25rem; }
.metric-link { display: inline-flex; align-items: center; gap: .35rem; min-height: 2.75rem; padding: .25rem .35rem; border-radius: .5rem; color: var(--primary); }
.metric-link:hover { background: var(--primary-soft); }
.metric-link :deep(strong) { font-size: .95rem; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.metric-link svg { font-size: .75rem; }
.daily-actions { display: flex; flex-wrap: wrap; gap: .4rem; }
.bonus-button { overflow: hidden; height: 1.75rem; padding-inline: .55rem; font-size: .75rem; }
.compact .metric-link { min-height: 2rem; padding-inline: .25rem; }
.compact .metric-link :deep(strong) { font-size: .85rem; }
.bonus-shine { position: absolute; pointer-events: none; top: -50%; bottom: -50%; left: -80%; width: 45%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent); transform: skewX(-20deg); animation: bonus-shine 6s ease-in-out infinite; }
.bonus-button:nth-child(2) .bonus-shine { animation-delay: 1s; }
@keyframes bonus-shine { 25%, 100% { left: 160%; } }
@media (prefers-reduced-motion: reduce) { .bonus-shine { animation: none; display: none; } }
@media (min-width: 48rem) { .metric-link { padding-inline: .6rem; } }
@media (max-width: 47.99rem) {
  .identity-metrics { gap: .2rem; overflow-x: auto; }
  .metric-link { gap: .2rem; padding-inline: .15rem; min-height: 2rem; white-space: nowrap; }
  .metric-link :deep(strong) { font-size: .75rem; overflow-wrap: normal; }
  .account-login { font-size: .8rem; }
}
</style>

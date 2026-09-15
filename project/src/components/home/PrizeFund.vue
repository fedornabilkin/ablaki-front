<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { NButton, NCard } from 'naive-ui';
import RequestState from '@/components/RequestState.vue';
import FormattedNumber from '@/components/FormattedNumber.vue';
import { usePageRequest } from '@/hooks/usePageRequest';
import { prizeFund, type PrizeFund } from '@/services/api/homeActivity';
import { person } from '@/services/api/portal';
const store = useStore();
const authenticated = computed(() => !!store.getters['auth/isAuthenticated']);
const accountVersion = computed(() => `${store.state.auth.revision}:${person(store.getters['auth/user']).rating}`);
const { data, loading, error, refresh } = usePageRequest(() => prizeFund(authenticated.value), null as PrizeFund | null, [accountVersion, authenticated]);
</script>
<template lang="pug">
n-card(title="Призовой фонд")
  template(#header-extra)
    n-button(quaternary :loading="loading" @click="refresh") Обновить
  request-state(:loading="loading" :error="error" :empty="!data" @retry="refresh")
    .fund-days(v-if="data")
      .fund-day
        h3 Сегодня
        strong.fund-amount
          formatted-number(:value="data.today")
          |  Cr
        p(v-if="data.user_today !== null")
          | Ваша расчётная доля: 
          formatted-number(:value="data.user_today")
          |  Cr
      .fund-day
        h3 Завтра
        strong.fund-amount
          formatted-number(:value="data.tomorrow")
          |  Cr
        p(v-if="data.user_tomorrow !== null")
          | Ваша расчётная доля: 
          formatted-number(:value="data.user_tomorrow")
          |  Cr
    p.muted Фонд формируется из кредитных комиссий игр. Доля зависит от рейтинга; сумма на завтра меняется в течение дня. Это прогноз, ежедневный бонус — 1 Cr.
    p(v-if="!authenticated")
      router-link(:to="{ path: '/users/login', query: { redirect: '/' } }") Войдите, чтобы увидеть свою долю.
</template>
<style scoped>
.fund-days { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: 1rem; }
.fund-amount { display: block; color: var(--primary); font-size: 1.6rem; margin-bottom: .5rem; }
</style>

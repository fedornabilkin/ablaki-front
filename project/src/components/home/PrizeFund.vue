<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { NButton, NCard, NPopover } from 'naive-ui';
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
    n-popover(trigger="click" :width="300")
      template(#trigger)
        n-button(quaternary circle aria-label="Как рассчитывается призовой фонд")
          font-awesome-icon(icon="question-circle" aria-hidden="true")
      p Фонд на сегодня — кредитные комиссии за вчера, на завтра — комиссии за сегодня. Сутки считаются по московскому времени.
      p Доля зависит от вашего рейтинга относительно суммы положительных рейтингов и округляется вверх. Завтрашний фонд меняется в течение дня.
      p Это прогноз; ежедневный бонус пока составляет 1 Cr.
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
    p(v-if="!authenticated")
      router-link(:to="{ path: '/users/login', query: { redirect: '/' } }") Войдите, чтобы увидеть свою долю.
</template>
<style scoped>
.fund-days { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: 1rem; }
.fund-amount { display: block; color: var(--primary); font-size: 1.6rem; margin-bottom: .5rem; }
</style>

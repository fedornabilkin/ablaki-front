<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { NButton, NCard, NPopover } from 'naive-ui';
import RequestState from '@/components/RequestState.vue';
import { usePageRequest } from '@/hooks/usePageRequest';
import { prizeFund, type PrizeFund } from '@/services/api/homeActivity';
import { person } from '@/services/api/portal';
import { useDailyRewards } from '@/hooks/useDailyRewards';
const store = useStore();
const authenticated = computed(() => !!store.getters['auth/isAuthenticated']);
const accountVersion = computed(() => `${store.state.auth.revision}:${person(store.getters['auth/user']).rating}`);
const { data, loading, error, refresh } = usePageRequest(() => prizeFund(authenticated.value), null as PrizeFund | null, [accountVersion, authenticated]);
const { available, claiming, claim } = useDailyRewards();
const canClaim = computed(() => available.data.value.items.some(item => item.id === 'bonus'));
const credits = (value: number) => value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        strong.fund-amount(:title="'Фонд сегодня: ' + credits(data.today) + ' Cr'") {{ credits(data.today) }} Cr
        p(v-if="data.user_today !== null" title="Ваша расчётная доля фонда")
          font-awesome-icon(icon="user" aria-hidden="true")
          |  {{ credits(data.user_today) }} Cr
        n-button(v-if="canClaim" type="primary" size="small" :loading="claiming === 'bonus'" :disabled="claiming !== null" @click="claim('bonus')") Получить приз · 1 Cr
        n-button(v-else-if="available.error.value && authenticated" size="small" @click="available.refresh") Повторить
        small.muted(v-else-if="authenticated && !available.loading.value") Приз получен
      .fund-day
        h3 Завтра
        strong.fund-amount(:title="'Накоплено на завтра: ' + credits(data.tomorrow) + ' Cr'") {{ credits(data.tomorrow) }} Cr
        p(v-if="data.user_tomorrow !== null" title="Ваш потенциальный приз из завтрашнего фонда")
          font-awesome-icon(icon="user" aria-hidden="true")
          |  ≈ {{ credits(data.user_tomorrow) }} Cr
    p(v-if="!authenticated")
      router-link(:to="{ path: '/users/login', query: { redirect: '/' } }") Войдите, чтобы увидеть свою долю.
</template>
<style scoped>
.fund-days { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.fund-day { min-width: 0; overflow-wrap: anywhere; }
.fund-day :deep(button) { max-width: 100%; height: auto; min-height: 2rem; white-space: normal; }
.fund-amount { display: block; color: var(--primary); font-size: clamp(1rem, 3vw, 1.6rem); margin-bottom: .5rem; font-variant-numeric: tabular-nums; }
</style>

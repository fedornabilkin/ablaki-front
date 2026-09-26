<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NCard } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import ListFilters from '@/components/ListFilters.vue';
import UserAvatar from '@/components/user/UserAvatar.vue';
import StatChart from '@/components/StatChart.vue';
import RequestState from '@/components/RequestState.vue';
import FormattedNumber from '@/components/FormattedNumber.vue';
import DailyActivityList from '@/components/home/DailyActivityList.vue';
import { date } from '@/services/api/portal';
import { rankingPeriods, useStatisticsPage } from '@/hooks/useStatisticsPage';

const { summary, ranking, search, filters, reset, choosePeriod } = useStatisticsPage();
const columns = [
  { key: 'total', label: 'Всего' }, { key: 'today', label: 'Сегодня' }, { key: 'yesterday', label: 'Вчера' },
] as const;
const cards = computed(() => {
  const stats = summary.data.value;
  if (!stats) return [];
  return [
    { title: 'Участники', chart: stats.charts?.users, chartLabel: 'Регистрации', rows: [{ label: 'Регистрации', stats: stats.users }, { label: 'Посетили', stats: { total: null, today: stats.visitorsToday, yesterday: null } }] },
    { title: 'Завершённые игры', chart: stats.charts?.games, chartLabel: 'Орлянка и сапёр', rows: [{ label: 'Орлянка', stats: stats.games.orel }, { label: 'Сапёр', stats: stats.games.saper }] },
    { title: 'Общение', chart: stats.charts?.forum, chartLabel: 'Темы и сообщения', rows: [{ label: 'Темы', stats: stats.forum.themes }, { label: 'Сообщения', stats: stats.forum.comments }, { label: 'Передано Cr', stats: stats.forum.credits }] },
    { title: 'Передача кредитов', chart: stats.charts?.transfers, chartLabel: 'Передачи', rows: [{ label: 'Передачи', stats: stats.transfers }] },
    { title: 'Биржа', chart: stats.charts?.exchange, chartLabel: 'Сделки', rows: [{ label: 'Сделки', stats: stats.exchange }] },
  ];
});
</script>
<template lang="pug">
page-header(page-title="Статистика")
.container.page.stack
  .cards
    daily-activity-list(kind="visitors")
    daily-activity-list(kind="bonuses")
  request-state(:loading="summary.loading.value" :error="summary.error.value" @retry="summary.refresh")
    .cards(v-if="summary.data.value")
      n-card(v-for="card in cards" :key="card.title" :title="card.title")
        table.stat-table(:aria-label="card.title")
          thead
            tr
              th(scope="col") Показатель
              th(v-for="column in columns" :key="column.key" scope="col") {{ column.label }}
          tbody
            tr(v-for="row in card.rows" :key="row.label")
              th(scope="row") {{ row.label }}
              td(v-for="column in columns" :key="column.key")
                formatted-number(:value="row.stats?.[column.key]")
        stat-chart(:points="card.chart" :label="card.chartLabel")
    p.muted.small Сегодня и вчера — календарные дни по московскому времени. Для игр и сделок период определяется датой создания записи. Прочерк означает, что сервер не предоставил данные.
  n-card(title="Рейтинг участников")
    p.muted За всё время показан текущий рейтинг, за выбранный период — полученный рейтинг. Сутки — последние 24 часа.
    .period-buttons(role="group" aria-label="Период рейтинга")
      n-button(v-for="period in rankingPeriods" :key="period.value" :type="filters.period === period.value ? 'primary' : 'default'" :secondary="filters.period !== period.value" :aria-pressed="filters.period === period.value" @click="choosePeriod(period.value)") {{ period.label }}
    list-filters(v-model:search="search" v-model:values="filters" :loading="ranking.loading.value" placeholder="Найти участника" @reset="reset")
    request-state(:loading="ranking.loading.value" :error="ranking.error.value" :empty="!ranking.data.value.items.length" @retry="ranking.refresh")
      .record-row(v-for="(user, index) in ranking.data.value.items" :key="user.id")
        .toolbar
          span.muted {{ index + 1 }}.
          user-avatar(:user="user")
        .ranking-dates.muted
          span Последнее посещение: {{ date(user.latest_activity || user.last_login_at) }}
          span Регистрация: {{ date(user.created_at) }}
        strong
          formatted-number(:value="user.rating")
</template>
<style scoped>
.stat-table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.stat-table th, .stat-table td { padding: .4rem .2rem; text-align: right; }
.stat-table th:first-child { text-align: left; font-weight: 400; }
.stat-table thead { color: var(--text-muted); font-size: .75rem; }
.stat-table td { font-weight: 600; }
.small { font-size: .8rem; }
.period-buttons { display: flex; flex-wrap: wrap; gap: .4rem; margin: .75rem 0; }
.ranking-dates { display: grid; gap: .2rem; font-size: .8rem; }
</style>

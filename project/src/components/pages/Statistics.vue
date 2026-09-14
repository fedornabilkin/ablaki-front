<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NCard } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import RequestState from '@/components/RequestState.vue';
import FormattedNumber from '@/components/FormattedNumber.vue';
import { field } from '@/services/api/portal';
import { rankingPeriods, useStatisticsPage } from '@/hooks/useStatisticsPage';

const { summary, ranking, page, search, filters, reset, choosePeriod } = useStatisticsPage();
const columns = [
  { key: 'total', label: 'Всего' }, { key: 'today', label: 'Сегодня' }, { key: 'yesterday', label: 'Вчера' },
] as const;
const cards = computed(() => {
  const stats = summary.data.value;
  if (!stats) return [];
  return [
    { title: 'Участники', rows: [{ label: 'Регистрации', stats: stats.users }] },
    { title: 'Завершённые игры', rows: [{ label: 'Орлянка', stats: stats.games.orel }, { label: 'Сапёр', stats: stats.games.saper }] },
    { title: 'Общение', rows: [{ label: 'Темы', stats: stats.forum.themes }, { label: 'Сообщения', stats: stats.forum.comments }] },
    { title: 'Передача кредитов', rows: [{ label: 'Передачи', stats: stats.transfers }] },
    { title: 'Биржа', rows: [{ label: 'Сделки', stats: stats.exchange }] },
  ];
});
</script>
<template lang="pug">
page-header(page-title="Статистика")
.container.page.stack
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
    p.muted.small Сегодня и вчера — календарные дни по московскому времени. Для игр и сделок период определяется датой создания записи. Прочерк означает, что сервер не предоставил данные.
  n-card(title="Рейтинг участников")
    p.muted За всё время показан текущий рейтинг, за выбранный период — полученный рейтинг. Сутки — последние 24 часа.
    .period-buttons(role="group" aria-label="Период рейтинга")
      n-button(v-for="period in rankingPeriods" :key="period.value" :type="filters.period === period.value ? 'primary' : 'default'" :secondary="filters.period !== period.value" :aria-pressed="filters.period === period.value" @click="choosePeriod(period.value)") {{ period.label }}
    list-filters(v-model:search="search" v-model:values="filters" :loading="ranking.loading.value" placeholder="Найти участника" @reset="reset")
    request-state(:loading="ranking.loading.value" :error="ranking.error.value" :empty="!ranking.data.value.items.length" @retry="ranking.refresh")
      .record-row(v-for="(user, index) in ranking.data.value.items" :key="user.id")
        .toolbar
          span.muted {{ (page - 1) * ranking.data.value.pageSize + index + 1 }}.
          router-link.record-title(:to="'/wall/' + encodeURIComponent(field(user.username))") {{ field(user.username) }}
        strong
          formatted-number(:value="user.rating")
    page-pager(v-if="!ranking.error.value" v-model:page="page" :result="ranking.data.value" :disabled="ranking.loading.value")
</template>
<style scoped>
.stat-table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.stat-table th, .stat-table td { padding: .4rem .2rem; text-align: right; }
.stat-table th:first-child { text-align: left; font-weight: 400; }
.stat-table thead { color: var(--text-muted); font-size: .75rem; }
.stat-table td { font-weight: 600; }
.small { font-size: .8rem; }
.period-buttons { display: flex; flex-wrap: wrap; gap: .4rem; margin: .75rem 0; }
</style>

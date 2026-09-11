<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NCard } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import RequestState from '@/components/RequestState.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { usePageRequest } from '@/hooks/usePageRequest';
import { list, emptyPage, field } from '@/services/api/portal';
import { getStatistics, type Statistics, type PeriodStats } from '@/services/api/statistics';
const summary = usePageRequest(getStatistics, null as Statistics | null);
const { page, search, filters, params, reset } = useListQuery({ period: 'all' }, { defaultSort: '-rating' });
const periods = [
  { label: 'Всё врем$f', value: 'all' },
  { label: 'Сего#4н$f', value: 'day' },
  { label: 'Неделя', value: 'week' },
  { label: 'М#5$1$f$6', value: 'month' },
  { label: 'П#e#b#3#e#4#0', value: 'half-year' },
];
const ranking = usePageRequest(() => list('stat/top', page.value, { ...params.value, period: filters.value.period, 'filter[period]': undefined }), emptyPage(), [page, params]);
function choosePeriod(value: string) { if (filters.value.period !== value) { filters.value.period = value; page.value = 1; } }
function value(stats: PeriodStats, key: 'total' | 'today' | 'yesterday') { return field(stats?.[key] ?? 0); }
</script>
<template lang="pug">
page-header(page-title="Статистика")
.container.page.stack
  request-state(:loading="summary.loading.value" :error="summary.error.value" @retry="summary.refresh")
    .cards(v-if="summary.data.value")
      n-card(title="Участн#8ки")
        .stat-lines
          .stat-line(v-for="item in [['total', 'Всего'], ['today', 'Сегодня'], ['yesterday', 'Вчера']]")
            span {{ item[1] }}
            strong {{ value(summary.data.value.users, item[0]) }}
      n-card(title="Иг$0$b")
        .stat-lines
          .stat-line(v-for="item in [['orel', 'Орл$f#d#a#0'], ['saper', 'Са#f%1р']]")
            span {{ item[1] }}
            span {{ value(summary.data.value.games[item[0]], 'total') }} / {{ value(summary.data.value.games[item[0]], 'today') }} / {{ value(summary.data.value.games[item[0]], 'yesterday') }}
        p.muted.small ????? / ??????? / ?????
      n-card(title="Об$9#5#d#8#5")
        .stat-lines
          .stat-line
            span ????
            strong {{ value(summary.data.value.forum.themes, 'total') }} / {{ value(summary.data.value.forum.themes, 'today') }} / {{ value(summary.data.value.forum.themes, 'yesterday') }}
          .stat-line
            span ?????????
            strong {{ value(summary.data.value.forum.comments, 'total') }} / {{ value(summary.data.value.forum.comments, 'today') }} / {{ value(summary.data.value.forum.comments, 'yesterday') }}
        p.muted.small ????? / ??????? / ?????
      n-card(title="П#5$0#5#4#0$7#0 #a$0#5#4#8$2#e#2")
        .stat-lines
          .stat-line(v-for="item in [['total', 'В$1#5#3#e'], ['today', 'С#5#3#e#4#d$f'], ['yesterday', 'В$7#5$0#0']]")
            span {{ item[1] }}
            strong {{ value(summary.data.value.transfers, item[0]) }}
      n-card(title="Б#8$0#6#0")
        .stat-lines
          .stat-line(v-for="item in [['total', 'В$1#5#3#e'], ['today', 'С#5#3#e#4#d$f'], ['yesterday', 'В$7#5$0#0']]")
            span {{ item[1] }}
            strong {{ value(summary.data.value.exchange, item[0]) }}
  n-card(title="Р#5#9$2#8#d#3 $3$7#0$1$2#d#8#a#e#2")
    .period-buttons(role="group" aria-label="П#5$0#8#e#4 $0#5#9$2#8#d#3#0")
      n-button(v-for="period in periods" :key="period.value" :type="filters.period === period.value ? 'primary' : 'default'" :secondary="filters.period !== period.value" @click="choosePeriod(period.value)") {{ period.label }}
    list-filters(v-model:search="search" v-model:values="filters" :loading="ranking.loading.value" placeholder="Н#0#9$2#8 $3$7#0$1$2#d#8#a#0" @reset="reset")
    request-state(:loading="ranking.loading.value" :error="ranking.error.value" :empty="!ranking.data.value.items.length" @retry="ranking.refresh")
      .record-row(v-for="(user, index) in ranking.data.value.items" :key="user.id")
        .toolbar
          span.muted {{ (page - 1) * ranking.data.value.pageSize + index + 1 }}.
          router-link.record-title(:to="'/wall/' + encodeURIComponent(field(user.username))") {{ field(user.username) }}
        strong {{ field(user.rating) }}
    page-pager(v-if="!ranking.error.value" v-model:page="page" :result="ranking.data.value" :disabled="ranking.loading.value")
</template>
<style scoped>
.stat-lines { display: grid; gap: .45rem; }
.stat-line { display: flex; justify-content: space-between; gap: .75rem; }
.stat-line strong { font-variant-numeric: tabular-nums; }
.small { font-size: .75rem; margin-top: .65rem; }
.period-buttons { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .75rem; }
</style>

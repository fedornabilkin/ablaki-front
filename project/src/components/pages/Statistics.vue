<script setup lang="ts">
import { NCard } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import RequestState from '@/components/RequestState.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { usePageRequest } from '@/hooks/usePageRequest';
import { list, emptyPage, field } from '@/services/api/portal';
import { getStatistics, type Statistics } from '@/services/api/statistics';
const summary = usePageRequest(getStatistics, null as Statistics | null);
const { page, search, filters, params, reset } = useListQuery({ period: 'all' }, { defaultSort: '-rating' });
const definitions = [{ key: 'period', label: 'Период рейтинга', options: [
  { label: 'За всё время', value: 'all' }, { label: 'За сутки', value: 'day' }, { label: 'За неделю', value: 'week' },
  { label: 'За месяц', value: 'month' }, { label: 'За полгода', value: 'half-year' },
] }];
const ranking = usePageRequest(() => list('stat/top', page.value, { ...params.value, period: filters.value.period, 'filter[period]': undefined }), emptyPage(), [page, params]);
</script>
<template lang="pug">
page-header(page-title="Статистика")
.container.page.stack
  request-state(:loading="summary.loading.value" :error="summary.error.value" @retry="summary.refresh")
    .cards(v-if="summary.data.value")
      n-card(title="Участников")
        strong.metric {{ summary.data.value.users }}
      n-card(title="Завершённых игр")
        p Орлянка: {{ summary.data.value.games.orel }}
        p Сапёр: {{ summary.data.value.games.saper }}
      n-card(title="Общение и обмен")
        p Тем: {{ summary.data.value.forum.themes }} · Сообщений: {{ summary.data.value.forum.comments }}
        p Сделок: {{ summary.data.value.exchange }}
  n-card(title="Рейтинг участников")
    p.muted За всё время показан текущий рейтинг, за выбранный период — полученный рейтинг. По умолчанию лучшие результаты вверху.
    list-filters(v-model:search="search" v-model:values="filters" :filters="definitions" :loading="ranking.loading.value" placeholder="Найти участника" @reset="reset")
    request-state(:loading="ranking.loading.value" :error="ranking.error.value" :empty="!ranking.data.value.items.length" @retry="ranking.refresh")
      .record-row(v-for="(user, index) in ranking.data.value.items" :key="user.id")
        .toolbar
          span.muted {{ (page - 1) * ranking.data.value.pageSize + index + 1 }}.
          router-link.record-title(:to="'/wall/' + encodeURIComponent(field(user.username))") {{ field(user.username) }}
        strong {{ field(user.rating) }}
    page-pager(v-if="!ranking.error.value" v-model:page="page" :result="ranking.data.value" :disabled="ranking.loading.value")
</template>
<style scoped>.metric { font-size: 2.25rem; }</style>

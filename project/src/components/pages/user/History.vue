<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { NAlert, NButton, NCard } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import RequestState from '@/components/RequestState.vue';
import PagePager from '@/components/PagePager.vue';
import ListFilters from '@/components/ListFilters.vue';
import { list, emptyPage, field, date } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
import { useListQuery } from '@/hooks/useListQuery';
import { historyTypes, type HistoryType } from '@/services/api/community';
const route = useRoute();
const rating = computed(() => route.path === '/rating');
const { page, search, filters, params, reset } = useListQuery({ type: '' });
const types = usePageRequest(() => historyTypes(rating.value ? 'rating' : 'balance'), [] as HistoryType[], [rating]);
const definitions = computed(() => [{ key: 'type', label: 'Тип операции', options: types.data.value }]);
const { data, loading, error, refresh } = usePageRequest(() => list(rating.value ? 'history/rating' : 'history/balance', page.value, params.value), emptyPage(), [rating, page, params]);
function change(value: unknown) { return value === null || value === undefined || !Number.isFinite(Number(value)) ? '—' : (Number(value) > 0 ? '+' : '') + field(value); }
</script>
<template lang="pug">
page-header(page-title="История счёта" :extra-links="[{ link: '/balance', title: 'Баланс и кредиты' }, { link: '/rating', title: 'Рейтинг' }]")
.container.page
  n-card
    list-filters(v-model:search="search" v-model:values="filters" :filters="definitions" :loading="loading" @reset="reset")
    n-alert.mb-3(v-if="types.error.value" type="warning")
      | Не удалось загрузить типы операций.
      n-button(text @click="types.refresh") Повторить
    request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
      article.record-row(v-for="entry in data.items" :key="entry.id")
        div
          h3 {{ field(entry.comment || entry.type) }}
          .muted {{ date(entry.created_at) }} · №{{ entry.id }}
        .stack(v-if="rating")
          strong Изменение: {{ change(entry.rating_up) }}
          span.muted Рейтинг после: {{ field(entry.rating) }}
        .stack(v-else)
          strong {{ change(entry.balance_up) }} Кг · {{ change(entry.credit_up) }} Cr
          span.muted После: {{ field(entry.balance) }} Кг · {{ field(entry.credit) }} Cr
    page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading")
</template>

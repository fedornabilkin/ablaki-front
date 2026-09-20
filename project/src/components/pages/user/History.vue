<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { NAlert, NCard, NSkeleton } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import RequestState from '@/components/RequestState.vue';
import PagePager from '@/components/PagePager.vue';
import ActionButton from '@/components/ActionButton.vue';
import { historyPresentation } from '@/services/historyPresentation';
import { list, emptyPage, field, date } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
import { useListQuery } from '@/hooks/useListQuery';
import { historyTypes, type HistoryType } from '@/services/api/community';
const route = useRoute();
const rating = computed(() => route.path === '/rating');
const { page, filters, params } = useListQuery({ type: '' });
const types = usePageRequest(() => historyTypes(rating.value ? 'rating' : 'balance'), [] as HistoryType[], [rating]);
const choices = computed(() => types.data.value.map(type => ({ value: type.value, ...historyPresentation(type.value), count: type.label.match(/ \(\d+\)$/)?.[0] || '' })));
const { data, loading, error, refresh } = usePageRequest(() => {
  const { q: _search, ...query } = params.value;
  return list(rating.value ? 'history/rating' : 'history/balance', page.value, query);
}, emptyPage(), [rating, page, params]);
function change(value: unknown) { return value === null || value === undefined || !Number.isFinite(Number(value)) ? '—' : (Number(value) > 0 ? '+' : '') + field(value); }
</script>
<template lang="pug">
page-header(page-title="История")
.container.page
  nav.history-tabs(aria-label="Раздел истории")
    router-link(to="/balance" :aria-current="!rating ? 'page' : undefined" :class="{ selected: !rating }")
      font-awesome-icon(icon="coins" aria-hidden="true")
      | Баланс
    router-link(to="/rating" :aria-current="rating ? 'page' : undefined" :class="{ selected: rating }")
      font-awesome-icon(icon="star" aria-hidden="true")
      | Рейтинг
  n-card
    .history-types(role="group" aria-label="Тип операции")
      action-button(icon="scroll" label="Все" :aria-pressed="!filters.type" :type="!filters.type ? 'primary' : 'default'" @click="filters = { type: '' }")
      action-button(v-for="choice in choices" :key="choice.value" :icon="choice.icon" :label="choice.label + choice.count" :aria-pressed="filters.type === choice.value" :type="filters.type === choice.value ? 'primary' : 'default'" @click="filters = { type: filters.type === choice.value ? '' : choice.value }")
      n-skeleton(v-if="types.loading.value" width="12rem" height="34px" aria-label="Загрузка типов операций")
    n-alert.mb-3(v-if="types.error.value" type="warning")
      | Не удалось загрузить типы операций.
      action-button(icon="arrow-right" label="Повторить" text @click="types.refresh")
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
<style scoped>
.history-tabs, .history-types { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 1rem; }
.history-tabs a { display: inline-flex; align-items: center; gap: .5rem; padding: .75rem 1rem; border-bottom: 2px solid transparent; }
.history-tabs .selected { color: var(--primary); border-bottom-color: var(--primary); }
</style>

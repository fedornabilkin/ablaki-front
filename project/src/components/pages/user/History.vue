<script setup lang="ts">
import SectionNav from '@/components/SectionNav.vue';
import WorldCredits from '@/components/pages/world/WorldCredits.vue';
import { formatCredits } from '@/entities/world/credits';
import { computed, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NCard, NSkeleton } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import RequestState from '@/components/RequestState.vue';
import PagePager from '@/components/PagePager.vue';
import ActionButton from '@/components/ActionButton.vue';
import { historyPresentation } from '@/services/historyPresentation';
import { field, date } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
import { useListQuery } from '@/hooks/useListQuery';
import { loadHistory, emptyHistory, type HistoryType } from '@/services/api/community';
const route = useRoute(), auth = useStore();
const rating = computed(() => route.path === '/rating');
const availableTypes = shallowRef<HistoryType[]>([]);
watch([rating, () => auth.state.auth.revision], () => { availableTypes.value = []; }, { flush: 'sync' });
const { page, filters, params } = useListQuery({ type: '' });
const { data, loading, error, refresh } = usePageRequest(() => {
  const { q: _search, ...query } = params.value;
  return loadHistory(rating.value ? 'rating' : 'balance', page.value, query);
}, emptyHistory(), [rating, page, params, () => auth.state.auth.revision]);
watch(data, value => { if (value.total !== null) availableTypes.value = value.types; }, { flush: 'sync' });
const choices = computed(() => availableTypes.value.map(type => ({ value: type.value, ...historyPresentation(type.value), count: type.label.match(/ \(\d+\)$/)?.[0] || '' })));
function change(value: unknown) { return value === null || value === undefined || !Number.isFinite(Number(value)) ? '—' : (Number(value) > 0 ? '+' : '') + field(value); }
</script>
<template lang="pug">
page-header(page-title="История")
.container.page
  section-nav.history-tabs(label="Раздел истории" :items="[{ to: '/balance', label: 'Баланс', icon: 'coins', active: !rating }, { to: '/rating', label: 'Рейтинг', icon: 'star', active: rating }]")
  n-card
    .history-types(role="group" aria-label="Тип операции")
      action-button(icon="scroll" label="Все" :aria-pressed="!filters.type" :type="!filters.type ? 'primary' : 'default'" @click="filters = { type: '' }")
      action-button(v-for="choice in choices" :key="choice.value" :icon="choice.icon" :label="choice.label + choice.count" :aria-pressed="filters.type === choice.value" :type="filters.type === choice.value ? 'primary' : 'default'" @click="filters = { type: filters.type === choice.value ? '' : choice.value }")
      n-skeleton(v-if="loading && !choices.length" width="12rem" height="34px" aria-label="Загрузка типов операций")
    request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
      article.record-row(v-for="entry in data.items" :key="entry.id")
        div
          h3 {{ field(entry.comment || entry.type) }}
          .muted {{ date(entry.created_at) }} · №{{ entry.id }}
        .stack(v-if="rating")
          strong Изменение: {{ change(entry.rating_up) }}
          span.muted Рейтинг после: {{ field(entry.rating) }}
        .stack(v-else)
          strong {{ change(entry.balance_up) }} Кг · {{ (Number(entry.credit_up) > 0 ? '+' : '') + formatCredits(entry.credit_up) }} кредиты
          span.muted После: {{ field(entry.balance) }} Кг · #[world-credits(:value="entry.credit")]
    page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading")
</template>
<style scoped>
.history-tabs, .history-types { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 1rem; }
</style>

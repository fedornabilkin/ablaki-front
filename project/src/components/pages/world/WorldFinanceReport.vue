<script setup lang="ts">
import { formatCredits } from '@/entities/world/credits';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSpin } from 'naive-ui';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { financeDirections, financeKinds, loadFinanceReport } from '@/services/api/worldFinanceReport';
import { worldError } from '@/services/api/world';
import WorldHelpHint from './WorldHelpHint.vue';
const props = defineProps<{ nodeId: number; session: number }>();
const list = useListQuery({ kind: '', direction: '' }, { prefix: 'finance' }), { page, search, filters } = list;
const params = computed(() => ({ page: page.value, q: list.params.value.q || '', kind: filters.value.kind || 'all', direction: filters.value.direction || 'all' }));
const filterFields = [
  { key: 'kind', label: 'Вид операции', options: [{ value: '', label: 'Все' }, ...Object.entries(financeKinds).map(([value, label]) => ({ value, label })), { value: 'other', label: 'Другие виды' }] },
  { key: 'direction', label: 'Движение средств', options: [{ value: '', label: 'Все' }, ...Object.entries(financeDirections).map(([value, label]) => ({ value, label }))] },
];
const state = shallowRef<Awaited<ReturnType<typeof loadFinanceReport>> | null>(null), loading = ref(false), error = ref('');
const roles = { budget: 'Бюджет', treasury: 'Казна' };
let generation = 0, disposed = false;
async function load() {
  const current = ++generation; state.value = null; loading.value = true; error.value = '';
  try { const result = await loadFinanceReport(props.nodeId, params.value); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session, params], load, { immediate: true, flush: 'sync' });
const date = (timestamp: number) => new Date(timestamp * 1000).toLocaleString('ru-RU');
const kindLabel = (kind: string) => Object.prototype.hasOwnProperty.call(financeKinds, kind) ? financeKinds[kind] : 'Другой вид операции';
onScopeDispose(() => { disposed = true; generation++; });
</script>
<template lang="pug">
section.world-finance-report#finance-report
  h3 Финансовый отчёт объекта
  world-help-hint(label="Что показывает финансовый отчёт")
    p Сводка охватывает историю только этого объекта. Переводы между его бюджетом и казной — внутренние движения; вложение владельца, внешние поступления и платежи показаны отдельно. Поиск и фильтры меняют журнал операций, но не итоговые суммы.
  p Личные Cr → бюджет. Поступления → казна → свой бюджет → казна родителя или оплата развития.
  p Сводка охватывает всю историю только этого объекта. Платежи между объектами и сбор собственной казны не создают новые кредиты; это не общая выручка мира.
  n-button(:loading="loading" @click="load") Обновить отчёт
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  template(v-if="state")
    p Снимок на {{ date(state.now) }}. Поиск и фильтры ниже меняют только журнал операций.
    h4 Движение средств за всё время
    dl.flows
      template(v-for="flow in state.flows" :key="flow.key")
        dt {{ flow.label }}
        dd {{ formatCredits(flow.amount) }} Cr
    h4 Остатки и сверка с журналом
    article(v-for="account in state.balances" :key="account.role")
      h5 {{ roles[account.role] }}
      p Остаток {{ formatCredits(account.amount) }} Cr · резерв {{ formatCredits(account.reserved) }} Cr · доступно {{ formatCredits(account.available) }} Cr
      p(v-if="account.matches") Остаток совпадает с журналом поступлений и списаний.
      n-alert(v-else type="warning") По журналу: {{ formatCredits(account.ledgerBalance) }} Cr. Остаток счёта отличается — требуется сверка администрацией. Отчёт не исправляет деньги автоматически.
  h4 Журнал операций
  list-filters(v-model:search="search" v-model:values="filters" :filters="filterFields" :loading="loading" placeholder="Поиск по назначению операции" @reset="list.reset")
  n-spin(v-if="loading" aria-label="Загрузка финансового отчёта")
  template(v-else-if="state")
    p(v-if="!state.items.length") По выбранным условиям операций нет.
    article(v-for="item in state.items" :key="item.id")
      h5 {{ financeDirections[item.direction] }} · {{ formatCredits(item.amount) }} Cr
      p {{ kindLabel(item.kind) }} · №{{ item.id }} · {{ date(item.at) }}
      p {{ item.source ? roles[item.source] : 'Внешний источник' }} → {{ item.destination ? roles[item.destination] : 'Внешний получатель' }}
      p {{ item.purpose }}
    page-pager(v-model:page="page" query-prefix="finance" :result="state")
</template>
<style scoped>
.world-finance-report { display: grid; gap: .75rem; min-width: 0; }
.flows { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .5rem 1rem; }
dd { margin: 0; overflow-wrap: anywhere; }
article { border: 1px solid var(--border); border-radius: .4rem; padding: .75rem; overflow-wrap: anywhere; }
@media (max-width: 480px) { .flows { grid-template-columns: minmax(0, 1fr); } dd { margin-bottom: .5rem; } }
</style>

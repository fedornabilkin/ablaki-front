<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSpin } from 'naive-ui';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { loadTreasuryReceipts, receiptStates } from '@/services/api/worldTreasuryReceipts';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; session: number }>();
const list = useListQuery({ status: 'open' }, { prefix: 'receipts' }), { page, search, filters } = list;
const params = computed(() => ({ page: page.value, q: list.params.value.q || '', status: filters.value.status || 'all' }));
const filterFields = [{ key: 'status', label: 'Поступления', options: [
  { value: 'open', label: 'Несобранные' }, { value: 'catching_up', label: 'Ожидают расчёта потерь' }, { value: 'closed', label: 'Закрытые' }, { value: 'all', label: 'Все' },
] }];
const state = shallowRef<Awaited<ReturnType<typeof loadTreasuryReceipts>> | null>(null), loading = ref(false), error = ref('');
let generation = 0, disposed = false;
async function load() {
  const current = ++generation; state.value = null; loading.value = true; error.value = '';
  try { const result = await loadTreasuryReceipts(props.nodeId, params.value); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session, params], load, { immediate: true, flush: 'sync' });
const date = (seconds: number) => new Date(seconds * 1000).toLocaleString('ru-RU');
const money = (value: string | number) => `${new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(value))} Cr`;
function duration(seconds: number): string {
  const days = Math.floor(seconds / 86400), hours = Math.floor(seconds % 86400 / 3600), minutes = Math.floor(seconds % 3600 / 60);
  return `${days ? `${days} д. ` : ''}${hours} ч. ${minutes} мин. ${seconds % 60} с.`;
}
onScopeDispose(() => { disposed = true; generation++; });
</script>
<template lang="pug">
section.world-receipts#treasury-receipts
  h3 Поступления казны
  p У каждого поступления свой срок защиты и сохранённая ставка потерь. Сбор переводит остаток в бюджет этого объекта.
  n-button(:loading="loading" @click="load") Обновить поступления
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  list-filters(v-model:search="search" v-model:values="filters" :filters="filterFields" :loading="loading" placeholder="Поиск по назначению поступления" @reset="list.reset")
  n-spin(v-if="loading" aria-label="Загрузка поступлений казны")
  template(v-else-if="state")
    p Данные на {{ date(state.now) }}. Чтобы увидеть изменения, обновите поступления.
    n-alert(v-if="state.catchingUp" type="warning") В казне есть поступления с необработанными периодами потерь. Сбор станет доступен после фонового расчёта. Поиск и фильтры могут скрывать такие поступления.
    p(v-if="!state.items.length") По выбранным условиям поступлений нет.
    article(v-for="item in state.items" :key="item.id")
      h4 Поступление №{{ item.id }} · {{ receiptStates[item.state] }}
      p {{ item.purpose }}
      p Получено {{ date(item.received) }} · {{ item.closed === null ? 'В казне' : 'Находилось в казне' }} {{ duration(item.age) }}
      dl
        dt Поступило
        dd {{ money(item.original) }}
        dt Осталось в казне
        dd {{ money(item.remaining) }}
        dt Собрано в бюджет
        dd {{ money(item.collected) }}
        dt Потеряно
        dd(:class="{ lost: item.lost !== '0.0000' }") {{ money(item.lost) }}
      p Условия №{{ item.policyRevision }}: защита {{ duration(item.protectedSeconds) }}, затем {{ item.rate / 100 }}% остатка каждые {{ duration(item.period) }}.
      p(v-if="item.closed !== null") Закрыто {{ date(item.closed) }}. Дальнейших потерь нет.
      p(v-else-if="item.state === 'exempt'") Для этого поступления ставка потерь равна нулю.
      template(v-else)
        p Защита {{ item.protectedUntil > state.now ? 'действует до' : 'закончилась' }} {{ date(item.protectedUntil) }}.
        p(v-if="item.next !== null") {{ item.pending ? 'Первый необработанный период' : 'Следующее списание' }}: {{ date(item.next) }}.
        p(v-if="item.pending") Сумма первого ожидающего списания: {{ money(item.nextAmount) }}. Учтён дробный остаток предыдущих расчётов.
        p(v-else) Прогноз на этот период: {{ money(item.nextAmount) }}, если не собрать поступление раньше. Учтён дробный остаток предыдущих расчётов.
        n-alert(v-if="item.pending" type="info") Ожидают расчёта периодов: {{ item.pending }}. Показана сумма только первого из них; итоговые потери могут быть больше.
        p(v-else-if="item.nextAmount === '0.0000'") Сейчас сумма меньше точности 0.0001 Cr. Дробный остаток сохраняется для последующих периодов.
      p Обработано периодов потерь: {{ item.processed }}.
    page-pager(v-model:page="page" query-prefix="receipts" :result="state")
</template>
<style scoped>
.world-receipts { display: grid; gap: .75rem; min-width: 0; }
article { border: 1px solid var(--border); border-radius: .4rem; padding: .75rem; overflow-wrap: anywhere; }
dl { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .4rem .75rem; }
dd { margin: 0; }
.lost { color: var(--color-danger, #c0392b); }
</style>

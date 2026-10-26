<script setup lang="ts">
import WorldCredits from '@/components/pages/world/WorldCredits.vue';
import { onScopeDispose, ref, watch } from 'vue';
import { NAlert } from 'naive-ui';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { loadEconomyHistory, historySources, economyKindLabel } from '@/services/api/worldEconomyHistory';
import { worldError } from '@/services/api/world';
import { formatCredits } from '@/entities/world/credits';
import { date } from '@/services/api/portal';
const props = defineProps<{ session: number }>();
const { page, search, filters, params, reset } = useListQuery({ source: 'commands' }, { prefix: 'economy' });
const result = ref<Awaited<ReturnType<typeof loadEconomyHistory>>>({ items: [], total: 0, pageSize: 20, currentPage: 1, pageCount: 0 });
const loading = ref(false), error = ref('');
let generation = 0;
async function load() {
  const current = ++generation; loading.value = true; error.value = '';
  try { const response = await loadEconomyHistory(filters.value.source || 'commands', page.value, params.value.q); if (current === generation) result.value = response; }
  catch (cause) { if (current === generation) { error.value = worldError(cause); result.value.items = []; } }
  finally { if (current === generation) loading.value = false; }
}
const classes: Record<string, string> = { internal: 'Внутренний перевод', internal_transfer: 'Перевод кредитов', expense: 'Расход', earned: 'Выручка', reward: 'Награда', incoming: 'Поступление', item_movement: 'Движение вещей', health: 'Здоровье', action: 'Действие' };
const phases: Record<string, string> = { create: 'Создание', claim: 'Получение', cancel: 'Отмена' };
const itemActions: Record<string, string> = { received: 'Получено', spent: 'Израсходовано', moved: 'Перемещено', created: 'Создано', collected: 'Собрано', sold: 'Продано', bought: 'Куплено' };
watch(() => props.session, () => { result.value = { items: [], total: 0, pageSize: 20, currentPage: 1, pageCount: 0 }; void load(); }, { immediate: true });
watch([params, page], () => { void load(); });
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
section.economy-history(aria-label="История экономики" :aria-busy="loading")
  h2 История экономики
  p Выручка, награды и переводы показаны отдельно. Внутренний перевод не увеличивает заработок.
  list-filters(v-model:search="search" v-model:values="filters" :filters="[{ key: 'source', label: 'Раздел', options: historySources }]" :loading="loading" placeholder="Поиск по виду операции" @reset="reset")
  n-alert(closable v-if="error" type="error") {{ error }}
  .economy-history-entries
    article(v-for="item in result.items" :key="`${item.source}:${item.id}`")
      strong {{ classes[item.classification] ?? 'Операция' }}
      span {{ economyKindLabel(item.kind) }}
      span(v-if="item.amount !== null") #[world-credits(:value="item.amount")]
      span(v-if="item.quantity !== null") {{ item.quantity }} ед.
      ul.economy-item-details(v-if="item.items.length")
        li(v-for="detail in item.items" :key="`${detail.id}:${detail.direction}`")
          span {{ itemActions[detail.direction] }}: {{ detail.name }}
          strong × {{ detail.quantity }}
      time {{ date(item.createdAt) }}
      details
        summary Подробности операции
        p(v-if="item.operation") Номер: {{ item.operation }}
        p(v-if="item.nodeId") Объект № {{ item.nodeId }}
        p(v-if="item.profileVersion") Версия условий: {{ item.profileVersion }}
        p(v-if="item.balanceBefore !== null") До: #[world-credits(:value="item.balanceBefore")]
        p(v-if="item.balanceAfter !== null") После: #[world-credits(:value="item.balanceAfter")]
        p(v-if="item.transferPhase") {{ phases[item.transferPhase] }} перевода
        p(v-if="item.transferIds.length") Номера переводов: {{ item.transferIds.join(', ') }}
  p(v-if="!loading && !result.items.length") Записей нет.
  page-pager(v-model:page="page" :result="result" :disabled="loading" query-prefix="economy")
</template>
<style scoped>
.economy-history { display: grid; gap: .75rem; min-width: 0; }.economy-history p, .economy-history h2 { margin: 0; }
.economy-history-entries { display: grid; gap: .5rem; }.economy-history-entries article { display: flex; flex-wrap: wrap; gap: .5rem 1rem; padding: .75rem; border: 1px solid var(--border); border-radius: .5rem; overflow-wrap: anywhere; }.economy-history time { color: var(--text-muted); }
.economy-item-details { flex-basis: 100%; display: grid; gap: .25rem; margin: 0; padding-left: 1.25rem; }.economy-item-details li strong { margin-left: .5rem; }
</style>

<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSpin } from 'naive-ui';
import { RouterLink } from 'vue-router';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { constructionStatus, loadConstruction, previewConstruction, type ConstructionAction } from '@/services/api/worldConstruction';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; session: number; writable: boolean; command: WorldCommandRunner }>();
const list = useListQuery({ status: '' }, { prefix: 'construction' }), { page, search, filters } = list;
const params = computed(() => ({ page: page.value, q: list.params.value.q || '', status: filters.value.status || '' }));
const state = shallowRef<Awaited<ReturnType<typeof loadConstruction>> | null>(null), quote = shallowRef<Awaited<ReturnType<typeof previewConstruction>> | null>(null);
const labels: Record<ConstructionAction, string> = { pause: 'Приостановить', resume: 'Продолжить', cancel: 'Отменить стройку' };
const filterFields = [{ key: 'status', label: 'Состояние', options: [{ value: '', label: 'Все' }, ...Object.entries(constructionStatus).map(([value, label]) => ({ value, label }))] }];
const error = ref(''), loading = ref(false), calculating = ref(false), { busy, pending } = props.command;
const locked = computed(() => busy.value || Boolean(pending.value) || !props.writable || !state.value?.writable);
let generation = 0, previewGeneration = 0, disposed = false;
function clear() { previewGeneration++; quote.value = null; calculating.value = false; }
async function load() {
  const current = ++generation; clear(); state.value = null; loading.value = true; error.value = '';
  try { const result = await loadConstruction(props.nodeId, params.value); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session, params], load, { immediate: true, flush: 'sync' });
watch([busy, () => props.writable], clear, { flush: 'sync' });
async function preview(node: number, action: ConstructionAction) {
  if (locked.value || calculating.value) return;
  clear(); const current = previewGeneration; calculating.value = true; error.value = '';
  try { const result = await previewConstruction(node, action); if (!disposed && current === previewGeneration) quote.value = result; }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
function confirm() {
  if (!quote.value || locked.value) return;
  void props.command.submit(`/nodes/${quote.value.node}/construction-${quote.value.action}`, {}, quote.value.quote);
}
const date = (timestamp: number) => new Date(timestamp * 1000).toLocaleString('ru-RU');
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.world-construction#construction
  h2 Строительство
  p Материалы и Cr зарезервированы до завершения. Ночлег и оборудование в новой постройке станут доступны после окончания работ.
  n-button(:loading="loading" :disabled="busy || Boolean(pending)" @click="load") Обновить стройки
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  list-filters(v-model:search="search" v-model:values="filters" :filters="filterFields" :loading="loading" placeholder="Найти стройку" @reset="list.reset")
  n-spin(v-if="loading" aria-label="Загрузка строек")
  template(v-else-if="state")
    p(v-if="!state.items.length") Строек по выбранным условиям нет. Начать строительство можно из предложений на своей площадке.
    article(v-for="item in state.items" :key="item.id")
      h3
        span(v-if="item.status === 'cancelled' || item.demolished") {{ item.name }}
        router-link(v-else :to="`/world/nodes/${item.node_id}`") {{ item.name }}
        |  · {{ constructionStatus[item.status] }}
      template(v-if="item.status === 'constructing' || item.status === 'paused'")
        p Зарезервировано из бюджета: {{ item.price }} Cr.
        p(v-if="item.status === 'paused'") Осталось работы: {{ Math.ceil(item.remaining_seconds / 60) }} мин. На паузе время не убывает.
        p(v-else-if="item.remaining_seconds") Ожидаемое окончание: {{ date(item.finish_at) }}.
        p(v-else) Время работ истекло. Ожидается завершение строительства.
        ul
          li(v-for="material in item.materials" :key="material.item_id") {{ material.name }}: {{ material.quantity }}
        n-button(v-if="item.status === 'constructing' && item.remaining_seconds > 0" :disabled="locked || calculating" @click="preview(item.node_id, 'pause')") Приостановить
        n-button(v-if="item.status === 'paused'" :disabled="locked || calculating" @click="preview(item.node_id, 'resume')") Продолжить
        n-button(:disabled="locked || calculating" @click="preview(item.node_id, 'cancel')") Отменить стройку…
      p(v-if="item.status === 'cancelled'") Резерв Cr освобождён в бюджете. Материалы возвращены в рюкзак.
      p(v-if="item.demolished") Постройка снесена, площадь освобождена. История строительства сохранена.
      p(v-if="item.room_id && !item.demolished")
        router-link(:to="`/world/nodes/${item.room_id}`") Открыть готовое помещение
    page-pager(v-model:page="page" query-prefix="construction" :result="state" :disabled="busy")
  section(v-if="quote" aria-live="polite")
    h3 {{ labels[quote.action] }}: {{ quote.name }}
    p(v-if="quote.action === 'pause'") Работы остановятся. Площадь, {{ quote.price }} Cr и материалы останутся зарезервированы.
    p(v-else-if="quote.action === 'resume'") Продолжится оставшееся время работ. Дополнительных списаний нет.
    template(v-else)
      p Площадь освободится, резерв {{ quote.price }} Cr вернётся в доступный бюджет площадки. Все материалы вернутся в рюкзак. Если места недостаточно, отмена не выполнится и резервы сохранятся.
      ul
        li(v-for="material in quote.materials" :key="material.item_id") {{ material.name }}: {{ material.quantity }}
      p Уже завершённую постройку отменить нельзя.
    n-button(type="primary" :disabled="locked" @click="confirm") Подтвердить
</template>
<style scoped>
.world-construction { display: grid; gap: .75rem; }
article { border: 1px solid var(--border); border-radius: .4rem; padding: 1rem; }
</style>

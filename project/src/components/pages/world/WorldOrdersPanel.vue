<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSpin } from 'naive-ui';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadOrders, previewOrderCancellation } from '@/services/api/worldOrders';
import { worldError } from '@/services/api/world';
import WorldOrderDelivery from './WorldOrderDelivery.vue';
import WorldOrderPublish from './WorldOrderPublish.vue';
const props = defineProps<{ nodeId: number; session: number; command: WorldCommandRunner }>();
const list = useListQuery({ status: 'open' }, { prefix: 'orders' }), { page, search, filters } = list;
const params = computed(() => ({ page: page.value, q: list.params.value.q || '', status: filters.value.status }));
const definitions = [{ key: 'status', label: 'Заказы', options: [{ label: 'Доступные', value: 'open' }, { label: 'Все', value: 'all' }] }];
const state = shallowRef<Awaited<ReturnType<typeof loadOrders>> | null>(null), cancellation = shallowRef<Awaited<ReturnType<typeof previewOrderCancellation>> | null>(null);
const selected = ref<number | null>(null), error = ref(''), loading = ref(false), calculating = ref(false), { busy, pending } = props.command;
const chosen = computed(() => state.value?.items.find(item => item.id === selected.value));
const labels: Record<string, string> = { open: 'Открыт', fulfilled: 'Выполнен', cancelled: 'Отменён', expired: 'Срок истёк' };
const date = (timestamp: number) => new Date(timestamp * 1000).toLocaleString('ru-RU');
let generation = 0, previewGeneration = 0, disposed = false;
function clear() { previewGeneration++; cancellation.value = null; calculating.value = false; }
async function load() {
  const current = ++generation; clear(); selected.value = null; state.value = null; loading.value = true; error.value = '';
  try { const result = await loadOrders(props.nodeId, params.value); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session, params], load, { immediate: true, flush: 'sync' });
watch([busy, selected], clear, { flush: 'sync' });
async function previewCancel(order: number) {
  if (!state.value?.can_publish || busy.value || pending.value || calculating.value) return;
  selected.value = null; clear(); const current = previewGeneration; calculating.value = true; error.value = '';
  try { const result = await previewOrderCancellation(props.nodeId, order); if (!disposed && current === previewGeneration) cancellation.value = result; }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
function cancel() { if (cancellation.value && state.value?.can_publish && !busy.value && !pending.value) void props.command.submit(`/nodes/${props.nodeId}/order-cancel`, { ...cancellation.value.input }, cancellation.value.quote); }
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.world-orders#settlement-orders
  h2 Заказы поселения
  p Сдавайте собранное сырьё и получайте оплату в казну своей стоянки. Количество и бюджет каждого заказа ограничены.
  n-button(:loading="loading" :disabled="busy" @click="load") Обновить заказы
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  list-filters(v-model:search="search" v-model:values="filters" :filters="definitions" :loading="loading" placeholder="Найти заказ" @reset="list.reset")
  n-spin(v-if="loading" aria-label="Загрузка заказов")
  template(v-else-if="state")
    p(v-if="!state.site_node_id") Начальные заказы доступны игрокам со стартовой стоянкой в этом поселении.
    router-link(v-else :to="`/world/nodes/${state.site_node_id}`") Казна и бюджет вашей стоянки
    p(v-if="!state.items.length") Заказов по выбранным условиям нет.
    ul.orders
      li(v-for="order in state.items" :key="order.id")
        h3 {{ order.item_name }} · {{ order.unit_price }} Cr за шт.
        p {{ order.purpose }}
        p Осталось {{ order.remaining_quantity }} из {{ order.quantity }} шт.; ваш оставшийся лимит — {{ order.my_remaining }} шт.
        p {{ labels[order.status] }} · срок до {{ date(order.expires_at) }}
        n-button(v-if="order.status === 'open'" :disabled="!state.can_deliver || !order.my_remaining || !order.remaining_quantity || busy || Boolean(pending) || calculating" @click="selected = order.id") Выбрать сырьё для сдачи
        n-button(v-if="state.can_publish && order.can_cancel" :disabled="busy || Boolean(pending) || calculating" @click="previewCancel(order.id)") Отменить остаток заказа
    page-pager(v-model:page="page" query-prefix="orders" :result="state" :disabled="busy")
    world-order-delivery(v-if="chosen" :key="chosen.id" :node-id="nodeId" :session="session" :order="chosen" :writable="state.can_deliver" :command="command")
    section(v-if="cancellation" aria-live="polite")
      p Заказ №{{ cancellation.input.order_id }} будет закрыт. Освободится {{ cancellation.released }} Cr резерва бюджета.
      n-button(type="primary" :disabled="busy || Boolean(pending)" @click="cancel") Подтвердить отмену остатка
    world-order-publish(v-if="state.can_publish" :node-id="nodeId" :session="session" :writable="state.can_publish" :command="command")
</template>
<style scoped>
.world-orders { display: grid; gap: .75rem; }
.orders { list-style: none; padding: 0; display: grid; gap: .75rem; }
.orders li { border: 1px solid var(--border); border-radius: .4rem; padding: 1rem; }
.orders button { margin: .25rem; }
</style>

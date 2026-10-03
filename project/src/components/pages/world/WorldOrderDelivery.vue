<script setup lang="ts">
import { formatCredits } from '@/entities/world/credits';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NInputNumber, NSelect, NSpin } from 'naive-ui';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadOrderStock, previewOrderDelivery, type StarterOrder } from '@/services/api/worldOrders';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; session: number; order: StarterOrder; writable: boolean; command: WorldCommandRunner }>();
const { page } = useListQuery({}, { prefix: 'orderstock' });
const stock = shallowRef<Awaited<ReturnType<typeof loadOrderStock>> | null>(null), quote = shallowRef<Awaited<ReturnType<typeof previewOrderDelivery>> | null>(null);
const inventory = ref<number | null>(null), quantity = ref<number | null>(1), error = ref(''), loading = ref(false), calculating = ref(false);
const { busy, pending } = props.command;
const selected = computed(() => stock.value?.items.find(item => item.id === inventory.value));
const maximum = computed(() => Math.min(10000, selected.value?.quantity ?? 0, props.order.remaining_quantity, props.order.my_remaining));
const options = computed(() => stock.value?.items.map(item => ({ value: item.id, label: `Ячейка ${item.position}: ${item.quantity} шт.` })) ?? []);
let generation = 0, previewGeneration = 0, disposed = false;
function clear() { previewGeneration++; quote.value = null; calculating.value = false; }
async function load() {
  const current = ++generation; clear(); inventory.value = null; quantity.value = 1; stock.value = null; loading.value = true; error.value = '';
  try { const result = await loadOrderStock(props.nodeId, props.order.item_id, page.value); if (!disposed && current === generation) stock.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session, () => props.order.id, page], load, { immediate: true, flush: 'sync' });
watch([inventory, quantity, busy, () => props.writable], clear, { flush: 'sync' });
async function preview() {
  if (!props.writable || busy.value || pending.value || calculating.value || !inventory.value || !quantity.value || quantity.value > maximum.value) return;
  clear(); error.value = ''; calculating.value = true; const current = previewGeneration;
  try { const result = await previewOrderDelivery(props.nodeId, { order_id: props.order.id, inventory_id: inventory.value, quantity: quantity.value }); if (!disposed && current === previewGeneration) quote.value = result; }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
function deliver() {
  if (quote.value && props.writable && !busy.value && !pending.value) void props.command.submit(`/nodes/${props.nodeId}/order-deliver`, { ...quote.value.input }, quote.value.quote);
}
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.order-delivery
  h3 Сдать: {{ order.item_name }}
  p Поселение использует переданное сырьё для указанной в заказе цели. Оплата поступит в казну вашей стоянки, откуда её можно собрать в бюджет.
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка предметов")
  template(v-else-if="stock")
    p(v-if="!stock.items.length") В доступных ячейках рюкзака нет этого сырья. Соберите его в мастерской или перенесите из сундука.
    router-link(to="/craft") Открыть мастерскую
    n-select(v-if="stock.items.length" v-model:value="inventory" :options="options" :disabled="busy || Boolean(pending)" placeholder="Выберите ячейку" aria-label="Ячейка рюкзака")
    page-pager(v-model:page="page" query-prefix="orderstock" :result="stock" :disabled="busy")
    label(v-if="selected") Количество — не более {{ maximum }}
      n-input-number(v-model:value="quantity" :min="1" :max="Math.max(1, maximum)" :precision="0" :disabled="busy || Boolean(pending)")
    n-button(:loading="calculating" :disabled="!writable || !selected || !quantity || quantity > maximum || busy || Boolean(pending)" @click="preview") Рассчитать сдачу
  section(v-if="quote" aria-live="polite")
    p Будет передано {{ quote.input.quantity }} шт. Оплата: {{ formatCredits(quote.earned) }} Cr.
    router-link(:to="`/world/nodes/${quote.site_node_id}`") Казна вашей стоянки
    p(v-if="quote.initialize_policy") При первой сдаче стоянка получит начальные условия этого заказа.
    p Отчисления при сборе: {{ quote.policy.rate_bps / 100 }}%. Срок оплаты отчислений: {{ quote.policy.due_seconds / 3600 }} ч.
    p Защита поступления: {{ quote.policy.protected_seconds / 3600 }} ч; затем потеря {{ quote.policy.loss_rate_bps / 100 }}% остатка каждые {{ quote.policy.loss_period_seconds / 3600 }} ч.
    n-button(type="primary" :disabled="!writable || busy || Boolean(pending)" @click="deliver") Передать сырьё и получить оплату
</template>
<style scoped>
.order-delivery { display: grid; gap: .75rem; padding: 1rem; border: 1px solid var(--border); border-radius: .4rem; }
label { display: grid; gap: .3rem; }
</style>

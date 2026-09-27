<script setup lang="ts">
import { computed, onScopeDispose, reactive, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NCheckbox, NInput, NInputNumber, NSelect } from 'naive-ui';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadOrderItems, previewOrderPublication } from '@/services/api/worldOrders';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; session: number; writable: boolean; command: WorldCommandRunner }>();
const list = useListQuery({}, { prefix: 'ordercatalog' }), { page, search, filters } = list;
const params = computed(() => ({ page: page.value, q: list.params.value.q || '' }));
const catalog = shallowRef<Awaited<ReturnType<typeof loadOrderItems>> | null>(null), quote = shallowRef<Awaited<ReturnType<typeof previewOrderPublication>> | null>(null);
const form = reactive({ item: null as number | null, quantity: null as number | null, limit: null as number | null, hours: null as number | null, price: '', purpose: '', initialize: false });
const error = ref(''), loading = ref(false), calculating = ref(false), { busy, pending } = props.command;
const options = computed(() => catalog.value?.items.map(item => ({ value: item.id, label: item.name })) ?? []);
let generation = 0, previewGeneration = 0, disposed = false;
function clear() { previewGeneration++; quote.value = null; calculating.value = false; }
async function load() {
  const current = ++generation; clear(); form.item = null; catalog.value = null; loading.value = true; error.value = '';
  try { const result = await loadOrderItems(props.nodeId, params.value); if (!disposed && current === generation) catalog.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session, params], load, { immediate: true, flush: 'sync' });
watch(form, clear, { flush: 'sync' });
watch([busy, () => props.writable], clear, { flush: 'sync' });
watch([() => props.nodeId, () => props.session], () => { form.quantity = null; form.limit = null; form.hours = null; form.price = ''; form.purpose = ''; form.initialize = false; }, { flush: 'sync' });
async function preview() {
  if (!props.writable || busy.value || pending.value || calculating.value) return;
  clear(); const current = previewGeneration; calculating.value = true; error.value = '';
  try {
    const result = await previewOrderPublication(props.nodeId, { item_id: form.item, quantity: form.quantity, per_user_limit: form.limit, lifetime_hours: form.hours,
      unit_price: form.price, purpose: form.purpose, initialize_starter_policy: form.initialize });
    if (!disposed && current === previewGeneration) quote.value = result;
  } catch (cause) { if (!disposed && current === previewGeneration) error.value = cause instanceof Error && cause.message.startsWith('invalid-') ? 'Заполните цену, количество, лимит, срок, назначение и подтвердите начальные условия.' : worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
function publish() { if (quote.value && props.writable && !busy.value && !pending.value) void props.command.submit(`/nodes/${props.nodeId}/order-publish`, { ...quote.value.input }, quote.value.quote); }
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
details.order-publication
  summary Опубликовать оплаченный заказ
  p Вся стоимость резервируется в бюджете поселения. Неиспользованный резерв освобождается после отмены или окончания срока.
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  list-filters(v-model:search="search" v-model:values="filters" :filters="[]" :loading="loading" placeholder="Найти сырьё в каталоге" @reset="list.reset")
  n-select(v-model:value="form.item" :options="options" :loading="loading" :disabled="busy || Boolean(pending)" placeholder="Сырьё из текущего каталога" aria-label="Предмет заказа")
  page-pager(v-if="catalog" v-model:page="page" query-prefix="ordercatalog" :result="catalog" :disabled="busy")
  label Всего предметов (до 1 000 000)
    n-input-number(v-model:value="form.quantity" :min="1" :max="1000000" :precision="0" :disabled="busy || Boolean(pending)")
  label Лимит на игрока
    n-input-number(v-model:value="form.limit" :min="1" :max="form.quantity || 1000000" :precision="0" :disabled="busy || Boolean(pending)")
  label Цена одного предмета, Cr
    n-input(v-model:value="form.price" inputmode="decimal" :maxlength="20" :disabled="busy || Boolean(pending)")
  label Срок заказа, ч (1–720)
    n-input-number(v-model:value="form.hours" :min="1" :max="720" :precision="0" :disabled="busy || Boolean(pending)")
  label Для чего поселению нужно сырьё
    n-input(v-model:value="form.purpose" :maxlength="255" :disabled="busy || Boolean(pending)")
  n-checkbox(v-model:checked="form.initialize" :disabled="busy || Boolean(pending)") Использовать текущие финансовые правила поселения как начальные условия стоянок без настроек. Действующие правила стоянок сохраняются.
  n-button(:loading="calculating" :disabled="!writable || busy || Boolean(pending)" @click="preview") Рассчитать резерв
  section(v-if="quote" aria-live="polite")
    p {{ quote.item_name }}: {{ quote.input.quantity }} шт. по {{ quote.input.unit_price }} Cr. В бюджете будет зарезервировано {{ quote.cost }} Cr.
    p На игрока — до {{ quote.input.per_user_limit }} шт. Срок — {{ quote.input.lifetime_hours }} ч.
    p Начальные условия: отчисления {{ quote.policy.rate_bps / 100 }}%, оплата в течение {{ quote.policy.due_seconds / 3600 }} ч после сбора; защита поступления {{ quote.policy.protected_seconds / 3600 }} ч, затем потери {{ quote.policy.loss_rate_bps / 100 }}% каждые {{ quote.policy.loss_period_seconds / 3600 }} ч.
    n-button(type="primary" :disabled="!writable || busy || Boolean(pending)" @click="publish") Зарезервировать бюджет и опубликовать
</template>
<style scoped>
.order-publication { padding: 1rem; border: 1px solid var(--border); border-radius: .4rem; }
label { display: grid; gap: .3rem; margin-block: .75rem; max-width: 36rem; }
summary { cursor: pointer; }
</style>

<script setup lang="ts">
import { computed, onScopeDispose, reactive, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NInput, NInputNumber } from 'naive-ui';
import { loadHarvest, previewHarvest, type HarvestAction } from '@/services/api/worldHarvest';
import { formatCredits } from '@/entities/world/credits';
import { worldError } from '@/services/api/world';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
const props = defineProps<{ nodeId: number; session: number; revision: number; command: WorldCommandRunner }>();
const state = shallowRef<Awaited<ReturnType<typeof loadHarvest>> | null>(null);
const selected = ref<number | null>(null), quantity = ref<number | null>(1), prices = reactive<Record<number, string>>({});
const error = ref(''), loading = ref(false), saving = ref(false);
let generation = 0, disposed = false, offset = 0;
const item = computed(() => state.value?.items.find(i => i.inventory_id === selected.value));
const cells = computed(() => Array.from({ length: 5 }, (_, i) => ({ position: i + 1, item: state.value?.items.find(row => row.position === i + 1) })));
const locked = computed(() => loading.value || saving.value || props.command.busy.value || !!props.command.pending.value || !state.value?.writable);
const total = computed(() => {
  if (!item.value?.price || !Number.isSafeInteger(quantity.value) || !quantity.value || quantity.value < 1) return null;
  const n = BigInt(item.value.price.replace('.', '')) * BigInt(quantity.value);
  return `${n / 10000n}.${String(n % 10000n).padStart(4, '0')}`;
});
const date = (time: number) => new Date(time * 1000).toLocaleString('ru-RU');
async function load() {
  const current = ++generation; loading.value = true; error.value = '';
  try {
    const result = await loadHarvest(props.nodeId);
    if (disposed || current !== generation) return;
    state.value = result; offset = result.server_time * 1000 - Date.now();
    for (const row of result.items) prices[row.inventory_id] = row.price ?? '';
    if (!result.items.some(i => i.inventory_id === selected.value)) selected.value = null;
    if (item.value) quantity.value = Math.max(1, Math.min(quantity.value ?? 1, item.value.quantity));
  } catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
async function act(action: HarvestAction, withdrawOffer = false) {
  if (locked.value || !item.value) return;
  const current = generation, expected = total.value;
  const input = { inventory_id: item.value.inventory_id, ...(action === 'price' ? { price: withdrawOffer ? null : prices[item.value.inventory_id] } : { quantity: quantity.value }) };
  saving.value = true; error.value = '';
  try {
    const result = await previewHarvest(props.nodeId, action, input);
    if (disposed || current !== generation) return;
    if (action === 'buy' && result.quote.terms.total !== expected) { await load(); error.value = 'Цена изменилась. Проверьте обновлённое предложение.'; return; }
    if (result.quote.terms.fits === false) { error.value = 'Освободите место в рюкзаке.'; return; }
    await props.command.submit(`/nodes/${props.nodeId}/harvest-${action}`, result.input, result.quote);
    if (!disposed && !props.command.pending.value && !props.command.error.value) await load();
  } catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed) saving.value = false; }
}
watch([() => props.nodeId, () => props.session], () => { state.value = null; selected.value = null; quantity.value = 1; void load(); }, { immediate: true });
watch(() => props.revision, () => { if (!saving.value) void load(); });
const timer = setInterval(() => { if (!locked.value && state.value?.items.some(i => !i.spoiled && (Date.now() + offset) >= i.fresh_until * 1000)) void load(); }, 5000);
onScopeDispose(() => { disposed = true; generation++; clearInterval(timer); });
</script>
<template lang="pug">
section.harvest-panel(aria-label="Склад урожая")
  h2 Склад урожая
  p Пять ячеек. После 14 суток хранения партия однократно теряет 30% оставшегося урожая. Покупки поступают в рюкзак, оплата — в казну огорода.
  n-alert(v-if="error" type="error") {{ error }}
  .harvest-grid
    button.harvest-cell(v-for="cell in cells" :key="cell.position" type="button" :class="{ selected: cell.item?.inventory_id === selected }" @click="selected = cell.item?.inventory_id ?? null; quantity = 1")
      template(v-if="cell.item")
        font-awesome-icon(:icon="cell.item.icon || 'seedling'" aria-hidden="true")
        strong {{ cell.item.name }}
        span {{ cell.item.quantity }} шт. · {{ cell.item.price ? `${formatCredits(cell.item.price)} Cr / шт.` : 'Не продаётся' }}
        small {{ cell.item.spoiled ? 'Потеря при хранении учтена' : `Свежий до ${date(cell.item.fresh_until)}` }}
      span(v-else) Свободно
  .harvest-actions(v-if="item")
    h3 {{ item.name }}
    label Количество
      n-input-number(v-model:value="quantity" :min="1" :max="item.quantity" :precision="0" :disabled="locked")
    template(v-if="state?.owned_by_me")
      n-button(:disabled="locked || !quantity || !item.quantity" @click="act('withdraw')") Забрать в рюкзак · бесплатно
      label Цена за штуку, Cr
        n-input(v-model:value="prices[item.inventory_id]" inputmode="decimal" :disabled="locked")
      n-button(:disabled="locked || !prices[item.inventory_id]" @click="act('price')") Выставить цену
      n-button(v-if="item.price" :disabled="locked" @click="act('price', true)") Снять с продажи
    n-button(v-else type="primary" :disabled="locked || !item.price || !quantity || !item.quantity" @click="act('buy')") Купить {{ quantity }} · {{ formatCredits(total) }} Cr
</template>
<style scoped>
.harvest-panel { display: grid; gap: .75rem; }.harvest-panel p, .harvest-cell small { color: var(--text-muted); }
.harvest-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .6rem; }.harvest-cell { display: grid; gap: .5rem; align-content: start; min-height: 8rem; padding: .75rem; border: 1px solid var(--border); border-radius: .5rem; background: var(--bg-surface); color: var(--text); cursor: pointer; }.harvest-cell.selected { outline: 2px solid var(--primary); }.harvest-cell svg { font-size: 1.5rem; color: var(--primary); }.harvest-cell span, .harvest-cell small { font-size: .8rem; }.harvest-actions { display: flex; flex-wrap: wrap; gap: .75rem; align-items: end; }.harvest-actions h3 { flex-basis: 100%; }.harvest-actions label { display: grid; gap: .4rem; max-width: 12rem; }
@media(max-width: 650px) { .harvest-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>

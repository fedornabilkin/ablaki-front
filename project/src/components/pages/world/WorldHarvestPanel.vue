<script setup lang="ts">
import AppPopover from '@/components/AppPopover.vue';
import WorldSectionHeading from './WorldSectionHeading.vue';
import WorldCredits from '@/components/pages/world/WorldCredits.vue';
import { worldActionButtonTheme } from '@/entities/world/theme';
import WorldCreditInput from './WorldCreditInput.vue';
import WorldPaymentSources from './WorldPaymentSources.vue';
import { computed, onScopeDispose, reactive, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NInputNumber, NSelect, NSpin } from 'naive-ui';
import WorldHelpHint from './WorldHelpHint.vue';
import ChoiceButtons from '@/components/ChoiceButtons.vue';
import WorldStoragePanel from './WorldStoragePanel.vue';
import { loadHarvest, previewHarvest, type HarvestAction } from '@/services/api/worldHarvest';
import { worldError } from '@/services/api/world';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
const props = withDefaults(defineProps<{ nodeId: number; session: number; revision: number; command: WorldCommandRunner; embedded?: boolean; active?: boolean }>(), { active: true });
const state = shallowRef<Awaited<ReturnType<typeof loadHarvest>> | null>(null);
const selected = ref<number | null>(null), quantity = ref<number | null>(1), prices = reactive<Record<number, string>>({});
const destination = ref<number | null>(null);
const mode = ref('items');
const modes = [{ value: 'items', label: 'Вещи', icon: 'cubes' }, { value: 'sales', label: 'Продажа', icon: 'coins' }];
const ownerStorage = computed(() => state.value?.owned_by_me && !props.embedded);
const showStorage = computed(() => ownerStorage.value && (mode.value === 'items' || !state.value?.allow_sales));
const destinations = computed(() => state.value?.destinations?.map(row => ({ label: `${row.name} · №${row.id}`, value: row.id })) ?? []);
const error = ref(''), loading = ref(false), saving = ref(false);
let generation = 0, disposed = false, offset = 0;
let dirty = false;
const visible = usePageVisibility();
const checkedSpoilage = new Set<string>();
const item = computed(() => state.value?.items.find(i => i.inventory_id === selected.value));
const cells = computed(() => Array.from({ length: state.value?.capacity ?? 5 }, (_, i) => ({ position: i + 1, item: state.value?.items.find(row => row.position === i + 1) })));
const locked = computed(() => loading.value || saving.value || props.command.busy.value || !!props.command.pending.value || !state.value?.writable);
const total = computed(() => {
  if (!item.value?.price || !Number.isSafeInteger(quantity.value) || !quantity.value || quantity.value < 1) return null;
  const n = BigInt(item.value.price.replace('.', '')) * BigInt(quantity.value);
  return `${n / 10000n}.${String(n % 10000n).padStart(4, '0')}`;
});
function showOffer(show: boolean, inventory: number | null) {
  if (saving.value || props.command.busy.value) return;
  if (show) { selected.value = inventory; quantity.value = 1; }
  else if (selected.value === inventory) selected.value = null;
}
const date = (time: number) => new Date(time * 1000).toLocaleString('ru-RU');
async function load() {
  const current = ++generation; loading.value = true; error.value = ''; dirty = false;
  try {
    const result = await loadHarvest(props.nodeId);
    if (disposed || current !== generation) return;
    state.value = result; offset = result.server_time * 1000 - Date.now();
    if (!result.destinations?.some(row => row.id === destination.value)) destination.value = result.destinations?.find(row => row.kind === 'backpack')?.id ?? result.destinations?.[0]?.id ?? null;
    for (const row of result.items) prices[row.inventory_id] = row.price ?? '';
    if (!result.items.some(i => i.inventory_id === selected.value)) selected.value = null;
    if (item.value) quantity.value = Math.max(1, Math.min(quantity.value ?? 1, item.value.quantity));
  } catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
async function act(action: HarvestAction, withdrawOffer = false) {
  if (locked.value || !item.value) return;
  const current = generation, expected = total.value;
  const input = { inventory_id: item.value.inventory_id, ...(action === 'price' ? { price: withdrawOffer ? null : prices[item.value.inventory_id] } : { quantity: quantity.value, ...(action === 'withdraw' && destination.value ? { destination_storage_id: destination.value } : {}) }) };
  saving.value = true; error.value = '';
  try {
    const result = await previewHarvest(props.nodeId, action, input);
    if (disposed || current !== generation) return;
    if (action === 'buy' && result.quote.terms.total !== expected) { await load(); error.value = 'Цена изменилась. Проверьте обновлённое предложение.'; return; }
    if (result.quote.terms.fits === false) { error.value = 'Освободите место в выбранном хранилище.'; return; }
    await props.command.submit(`/nodes/${props.nodeId}/harvest-${action}`, result.input, result.quote);
    if (!disposed && current === generation && props.command.error.value) error.value = props.command.error.value;
    if (!disposed && !props.command.pending.value && !props.command.error.value) await load();
  } catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed) saving.value = false; }
}
watch([() => props.nodeId, () => props.session], () => { checkedSpoilage.clear(); mode.value = 'items'; state.value = null; selected.value = null; destination.value = null; quantity.value = 1; if (props.active !== false) void load(); }, { immediate: true });
watch(mode, () => { selected.value = null; if (mode.value === 'sales') void load(); });
watch(() => props.revision, () => { dirty = true; if (visible.value && props.active !== false && !saving.value) void load(); });
function checkSpoilage() {
  if (!visible.value || props.active === false || locked.value || !state.value) return;
  const due = state.value.items.filter(i => !i.spoiled && Date.now() + offset >= i.fresh_until * 1000 && !checkedSpoilage.has(`${i.inventory_id}:${i.fresh_until}`));
  if (!due.length) return;
  due.forEach(i => checkedSpoilage.add(`${i.inventory_id}:${i.fresh_until}`));
  void load();
}
const timer = setInterval(checkSpoilage, 5000);
watch([visible, () => props.active], () => { if (!visible.value || props.active === false) return; if ((!state.value || dirty) && !loading.value) void load(); else checkSpoilage(); });
onScopeDispose(() => { disposed = true; generation++; clearInterval(timer); });
</script>
<template lang="pug">
section.harvest-panel(:class="{ 'harvest-panel--embedded': embedded }" aria-label="Продукция склада" :aria-busy="loading")
  world-section-heading.harvest-heading(icon="box" :level="embedded ? 'h3' : 'h2'" :title="embedded ? 'Ресурсы мини-склада' : state?.owned_by_me ? 'Вещи на складе' : 'Продукция склада'")
    world-help-hint(label="Хранение и покупка ресурсов")
      p Покупки поступают в рюкзак, оплата — родительскому объекту склада.
      p(v-if="state?.npc_supply") Здесь продаётся сырьё, добытое игроками. Выручка возвращается в бюджеты стартовых объектов NPC для оплаты работы.
      p(v-else) Урожай после 14 суток хранения однократно теряет 30% количества.
  choice-buttons(v-if="ownerStorage && state?.allow_sales" v-model="mode" :options="modes" label="Режим склада" :disabled="saving || command.busy.value || !!command.pending.value")
  router-link.harvest-inventory-link(v-if="embedded && state?.owned_by_me" :to="`/world/nodes/${nodeId}#workshop`")
    font-awesome-icon(icon="exchange-alt" aria-hidden="true")
    |  Переместить вещи
  p.harvest-capacity(v-if="state && !showStorage") {{ state.capacity }} ячеек{{ state.slot_limit ? ` · до ${state.slot_limit} шт. в ячейке` : '' }}
  n-spin(v-if="loading && !state" size="small" aria-label="Загружаем ресурсы склада")
  n-alert(closable v-if="error" type="error") {{ error }}
  world-storage-panel(v-if="showStorage" embedded :node-id="nodeId" :session="session" :revision="revision" :command="command" :writable="!!state?.writable" @changed="load")
  .harvest-grid(v-if="state && !showStorage")
    app-popover(v-for="cell in cells" :key="cell.position" trigger="manual" placement="bottom" @clickoutside="showOffer(false, cell.item?.inventory_id ?? null)" @keydown.esc="showOffer(false, cell.item?.inventory_id ?? null)" width="20rem" :show="Boolean(cell.item && cell.item.inventory_id === selected)" @update:show="showOffer($event, cell.item?.inventory_id ?? null)")
      template(#trigger)
        button.harvest-cell(type="button" @click="showOffer(selected !== cell.item?.inventory_id, cell.item?.inventory_id ?? null)" :class="{ selected: cell.item?.inventory_id === selected }" :disabled="!cell.item || saving || command.busy.value" :aria-expanded="!!cell.item && cell.item.inventory_id === selected")
          template(v-if="cell.item")
            font-awesome-icon(:icon="cell.item.icon || 'seedling'" aria-hidden="true")
            strong {{ cell.item.name }}
            span {{ cell.item.quantity }} шт. ·
              template(v-if="cell.item.price") #[world-credits(:value="cell.item.price")] / шт.
              template(v-else) Не продаётся
            small(v-if="cell.item.fresh_until < 2147483647") {{ cell.item.spoiled ? 'Потеря при хранении учтена' : `Свежий до ${date(cell.item.fresh_until)}` }}
          span(v-else) Свободно
      .harvest-actions(v-if="item && item.inventory_id === cell.item?.inventory_id")
        .harvest-popover-heading
          h3 {{ item.name }}
          button.harvest-close(type="button" aria-label="Закрыть покупку" :disabled="saving || command.busy.value" @click="selected = null")
            font-awesome-icon(icon="xmark" aria-hidden="true")
        n-alert(v-if="error" type="error") {{ error }}
        template(v-if="state?.owned_by_me")
          section.harvest-action-block(aria-label="Перемещение урожая")
            h4 Перемещение урожая
            label Количество
              n-input-number(v-model:value="quantity" :min="1" :max="item.quantity" :precision="0" :disabled="locked")
            label(v-if="destinations.length") Куда переместить
              n-select(v-model:value="destination" :options="destinations" filterable :disabled="locked")
            n-button(:theme-overrides="worldActionButtonTheme" :disabled="locked || !quantity || !item.quantity" @click="act('withdraw')") Переместить
          section.harvest-action-block(v-if="state.allow_sales" aria-label="Продажа урожая")
            h4 Продажа урожая
            p(v-if="item.price") В продаже за #[world-credits(:value="item.price")] / шт.
            p(v-else) Не продаётся
            label Цена за штуку
              world-credit-input(v-model:value="prices[item.inventory_id]" inputmode="decimal" :disabled="locked")
            n-button(:theme-overrides="worldActionButtonTheme" :disabled="locked || !prices[item.inventory_id]" @click="act('price')") Установить цену продажи
            n-button(:theme-overrides="worldActionButtonTheme" v-if="item.price" :disabled="locked" @click="act('price', true)") Снять с продажи
        section.harvest-action-block(v-else aria-label="Покупка урожая")
          .harvest-action-heading
            router-link.harvest-inventory-link(to="/world/workspace/inventory")
              font-awesome-icon(icon="box-open" aria-hidden="true")
              |  Рюкзак
            world-help-hint(label="Подготовка рюкзака")
              p Если рюкзак ещё не подготовлен, откройте инвентарь и получите стартовый набор. Покупка поступит туда же.
          world-payment-sources(mode="personal" :price="total")
          label Количество
            n-input-number(v-model:value="quantity" :min="1" :max="item.quantity" :precision="0" :disabled="locked")
          n-button(:theme-overrides="worldActionButtonTheme" type="primary" :disabled="locked || !state?.allow_sales || !item.price || !quantity || !item.quantity" @click="act('buy')") Купить {{ quantity }}#[world-credits(:value="total ?? '0'" cost)]
</template>
<style scoped>
.harvest-panel { display: grid; gap: .75rem; min-width: 0; padding: 1.25rem; }.harvest-panel--embedded { padding: 0; }.harvest-panel p, .harvest-cell small { color: var(--text-muted); }
.harvest-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .6rem; }.harvest-cell { display: grid; gap: .5rem; align-content: start; min-height: 8rem; padding: .75rem; border: 1px solid var(--border); border-radius: .5rem; background: var(--bg-surface); color: var(--text); cursor: pointer; }.harvest-cell.selected { outline: 2px solid var(--primary); }.harvest-cell svg { font-size: 1.3rem; color: var(--text-muted); }.harvest-cell span, .harvest-cell small { font-size: .8rem; }.harvest-actions { display: flex; flex-wrap: wrap; gap: .75rem; align-items: end; }.harvest-actions h3 { flex-basis: 100%; }.harvest-actions label { display: grid; gap: .4rem; max-width: 12rem; }
@media(min-width: 760px) { .harvest-grid { grid-template-columns: repeat(auto-fit, minmax(112px, 1fr)); } }
.harvest-actions { display: grid; grid-template-columns: minmax(0, 1fr); align-items: stretch; }
.harvest-actions h3 { grid-column: 1 / -1; margin: 0; }
.harvest-action-block { display: grid; align-content: start; gap: .75rem; padding: .5rem 0; min-width: 0; }
.harvest-action-block h4, .harvest-action-block p { margin: 0; }.harvest-actions label { max-width: none; }
.harvest-action-heading { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
.harvest-inventory-link { display: inline-flex; align-items: center; gap: .4rem; min-height: 2.75rem; }
.harvest-heading { display: flex; align-items: start; justify-content: space-between; gap: .5rem; }.harvest-heading h2, .harvest-heading h4 { margin: 0; }.harvest-capacity { margin: 0; font-size: .8rem; }
.harvest-panel--embedded .harvest-grid { grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr)); }.harvest-panel--embedded .harvest-cell { padding: .5rem; min-height: 6rem; }.harvest-panel--embedded .harvest-actions { grid-template-columns: minmax(0, 1fr); }
@media(max-width: 650px) { .harvest-actions { grid-template-columns: minmax(0, 1fr); } }
.harvest-popover-heading { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }.harvest-popover-heading h3 { margin: 0; }.harvest-close { display: grid; place-items: center; width: 2.75rem; height: 2.75rem; flex-shrink: 0; border: 0; border-radius: .5rem; background: transparent; color: var(--text-muted); cursor: pointer; }
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NButton, NInputNumber, NModal } from 'naive-ui';
import type { CraftState, CraftSlot, CraftInput } from '@/services/api/classicCraft';
import { insideTrash, INVENTORY_CELLS, slotPurchaseCost } from '@/entities/craft/inventory';
import CraftSlotGrid from './CraftSlotGrid.vue';
const props = defineProps<{state: CraftState; blocked: boolean}>();
const emit = defineEmits<{command: [action: 'use' | 'discard' | 'merge', id: number, quantity: number, slotId: number, targetSlotId?: number]; submit: [input: CraftInput]}>();
const items = computed(() => new Map(props.state.items.map(i => [i.id, i])));
const active = computed(() => props.state.active_slots ?? 20);
const permanent = computed(() => props.state.permanent_slots ?? 20);
const allSlots = computed(() => [...props.state.inventory_slots, ...(props.state.containers ?? []).flatMap(c => c.slots)]);
const overflow = computed(() => props.state.inventory_slots.filter((s, index) => (s.position ?? index + 1) > INVENTORY_CELLS));
const selectedId = ref<number | null>(null), discardId = ref<number | null>(null), chestId = ref<number | null>(null);
const selected = computed(() => allSlots.value.find(s => s.id === selectedId.value));
const chest = computed(() => props.state.containers?.find(c => c.id === chestId.value));
const repair = computed(() => chest.value?.repair);
function repairChest() {
  const current = chest.value, slot = props.state.inventory_slots.find(s => s.id === current?.id);
  if (!props.blocked && current?.repair && !current.repair.reasons.length && slot) emit('submit', {action: 'repair', id: slot.item_id, slot_id: slot.id, quantity: 1});
}
const discarded = computed(() => props.state.inventory_slots.find(s => s.id === discardId.value));
const discardQuantity = ref<number | null>(1), useQuantity = ref<number | null>(1), moveQuantity = ref<number | null>(1);
const showDiscard = computed({get: () => !!discarded.value, set: value => { if (!value) discardId.value = null; }});
const showBuy = ref(false), buyQuantity = ref<number | null>(1), quotedBase = ref(0), quotedPermanent = ref(20), quotedLinear = ref(false);
const quotedPrice = computed(() => slotPurchaseCost(quotedPermanent.value, 1, quotedBase.value, quotedLinear.value));
const quotedTotal = computed(() => slotPurchaseCost(quotedPermanent.value, Number(buyQuantity.value), quotedBase.value, quotedLinear.value));
const validBuy = computed(() => !props.blocked && Number.isSafeInteger(buyQuantity.value) && Number(buyQuantity.value) >= 1 && Number(buyQuantity.value) <= 50 - permanent.value && Number.isFinite(quotedTotal.value) && quotedTotal.value <= props.state.credit);
function requestBuy() { if (!props.blocked && props.state.inventory_settings && permanent.value < 50) { quotedBase.value = props.state.inventory_settings.slot_price; quotedPermanent.value = permanent.value; quotedLinear.value = props.state.slot_pricing === 'linear'; buyQuantity.value = 1; showBuy.value = true; } }
function buy() { if (!validBuy.value) return false; emit('submit', {action: 'buy_slots', id: 0, quantity: buyQuantity.value!, unit_price: quotedPrice.value, total_price: quotedTotal.value}); showBuy.value = false; }
const trash = ref<HTMLElement>();
type Destination = {container: number; position: number};
const drag = ref<{slotId: number; pointerId: number; startX: number; startY: number; x: number; y: number; moving: boolean} | null>(null);
const overTrash = ref(false), overSlot = ref<Destination | null>(null);
const slotElements = new Map<string, {element: HTMLElement; target: Destination}>();
function slotElement(container: number, position: number, element: unknown) { const key = `${container}:${position}`; if (element) slotElements.set(key, {element: element as HTMLElement, target: {container, position}}); else slotElements.delete(key); }
function canMove(source: CraftSlot, target: Destination) {
  if (props.blocked) return false;
  const container = target.container ? props.state.containers?.find(c => c.id === target.container) : null;
  if (target.container && (!container || container.durability < 1 || items.value.get(source.item_id)?.storage_kind === 'chest')) return false;
  if (target.position < 1 || target.position > (container?.capacity ?? active.value)) return false;
  const rows = container?.slots ?? props.state.inventory_slots;
  const occupied = rows.find((s, index) => (s.position ?? index + 1) === target.position);
  return !occupied || (occupied.id !== source.id && occupied.item_id === source.item_id && occupied.quantity < (items.value.get(source.item_id)?.stack_size ?? 1));
}
function transfer(source: CraftSlot, target: Destination, quantity: number) {
  if (!canMove(source, target) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > Math.min(source.quantity, 10000)) return;
  emit('submit', {action: 'transfer', id: source.item_id, quantity, slot_id: source.id, container_id: target.container, position: target.position});
}
function destination(container: number, position: number) { if (selected.value) transfer(selected.value, {container, position}, Math.min(selected.value.quantity, 10000)); }
function moveSelected(container: number) {
  if (!selected.value) return;
  const count = container ? props.state.containers?.find(c => c.id === container)?.capacity ?? 0 : active.value;
  for (let position = 1; position <= count; position++) if (canMove(selected.value, {container, position})) { transfer(selected.value, {container, position}, Number(moveQuantity.value)); return; }
}
const inBackpack = computed(() => !!selected.value && props.state.inventory_slots.some(s => s.id === selectedId.value));
const movable = computed(() => selected.value && Number.isSafeInteger(moveQuantity.value) && Number(moveQuantity.value) > 0 && Number(moveQuantity.value) <= Math.min(selected.value.quantity, 10000));
let suppressClick = false;
const rarities: Record<string, string> = {common: 'Обычный', uncommon: 'Необычный', rare: 'Редкий', epic: 'Эпический', legendary: 'Легендарный'};
const canDiscard = (slot: CraftSlot) => !props.blocked && !!items.value.get(slot.item_id)?.destroyable && !props.state.containers?.find(c => c.id === slot.id)?.slots.length;
function down(event: PointerEvent, slot: CraftSlot) {
  if (event.button !== 0 || props.blocked || drag.value) return;
  suppressClick = false;
  drag.value = {slotId: slot.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moving: false};
  (event.currentTarget as Element).setPointerCapture(event.pointerId);
}
function move(event: PointerEvent) {
  if (!drag.value || drag.value.pointerId !== event.pointerId) return;
  drag.value.x = event.clientX; drag.value.y = event.clientY;
  if (Math.hypot(event.clientX - drag.value.startX, event.clientY - drag.value.startY) > 6) drag.value.moving = true;
  const rect = trash.value?.getBoundingClientRect();
  overTrash.value = !!rect && drag.value.moving && insideTrash(drag.value, rect); overSlot.value = null;
  const source = allSlots.value.find(s => s.id === drag.value?.slotId);
  if (source && drag.value.moving && !overTrash.value) for (const {element, target} of slotElements.values()) {
    if (canMove(source, target) && insideTrash(drag.value, element.getBoundingClientRect())) { overSlot.value = target; break; }
  }
}
function requestDiscard(slot: CraftSlot) {
  if (!canDiscard(slot) || !props.state.inventory_slots.some(s => s.id === slot.id)) return;
  discardId.value = slot.id; discardQuantity.value = Math.min(10000, slot.quantity);
}
function cancel() { drag.value = null; overTrash.value = false; overSlot.value = null; }
function up(event: PointerEvent) {
  if (!drag.value || drag.value.pointerId !== event.pointerId) return;
  move(event); suppressClick = drag.value.moving;
  const slot = allSlots.value.find(s => s.id === drag.value?.slotId);
  if (slot && overTrash.value) requestDiscard(slot);
  else if (slot && overSlot.value) transfer(slot, overSlot.value, Math.min(slot.quantity, 10000));
  cancel();
}
function select(event: MouseEvent, slot: CraftSlot) {
  if (suppressClick && event.detail !== 0) { suppressClick = false; return; }
  selectedId.value = slot.id; useQuantity.value = 1; moveQuantity.value = Math.min(slot.quantity, 10000);
  if (items.value.get(slot.item_id)?.storage_kind === 'chest') chestId.value = slot.id;
}
const validDiscard = computed(() => !!discarded.value && canDiscard(discarded.value) && Number.isSafeInteger(discardQuantity.value) && Number(discardQuantity.value) >= 1 && Number(discardQuantity.value) <= Math.min(10000, discarded.value.quantity));
function confirmDiscard() { if (!validDiscard.value || !discarded.value) return false; emit('command', 'discard', discarded.value.item_id, discardQuantity.value!, discarded.value.id); discardId.value = null; }
const usable = computed(() => { const item = selected.value && items.value.get(selected.value.item_id); return inBackpack.value && item?.active && (item.use_xp || item.storage_kind === 'elixir'); });
function use() { const slot = selected.value, qty = useQuantity.value; if (slot && usable.value && !props.blocked && qty && Number.isSafeInteger(qty) && qty > 0 && qty <= Math.min(10000, slot.quantity)) emit('command', 'use', slot.item_id, qty, slot.id); }
watch(() => props.blocked, blocked => { if (blocked) cancel(); });
watch(() => props.state, cancel);
</script>
<template lang="pug">
.craft-inventory
  .inventory-scroll
    .inventory-status
      span Активно {{ active }} / 50 · постоянно {{ permanent }}
      n-button(v-if="permanent < 50" size="small" :disabled="blocked" @click="requestBuy") Открыть слоты
    p.muted(v-if="state.slots_expire_at") Временные слоты до {{ new Date(state.slots_expire_at * 1000).toLocaleString('ru-RU') }}
    craft-slot-grid(:slots="state.inventory_slots" :count="50" :active="active" :items="items" :selected="selected" :blocked="blocked" :target="overSlot?.container === 0 ? overSlot.position : undefined" :dragging="drag?.moving ? drag.slotId : undefined" label="Инвентарь: 10 на 5 слотов" @element="(position, element) => slotElement(0, position, element)" @choose="select" @down="down" @move="move" @up="up" @cancel="cancel" @destination="position => destination(0, position)" @unlock="requestBuy")
      .trash-cell(role="listitem")
        button.trash-target(ref="trash" type="button" :class="{over: overTrash}" :disabled="blocked" title="Корзина" aria-label="Корзина: перетащите предмет или выберите его и нажмите Enter здесь" @click="selected && requestDiscard(selected)")
          font-awesome-icon(icon="trash-alt")
    .overflow-items(v-if="overflow.length")
      p Предметы сверх 50 слотов сохранены. Они займут освободившиеся активные слоты.
      button.slot-item(v-for="slot in overflow" :key="slot.id" type="button" :aria-label="items.get(slot.item_id)?.name + ': ' + slot.quantity + ' шт.'" :class="{matching: selected && selected.id !== slot.id && selected.item_id === slot.item_id}" :disabled="blocked" @pointerdown="down($event, slot)" @pointermove="move" @pointerup="up" @pointercancel="cancel" @lostpointercapture="cancel" @click="select($event, slot)") {{ items.get(slot.item_id)?.name }} × {{ slot.quantity }}
  aside.inventory-details(v-if="selected || chest" aria-label="Описание предмета и сундук")
    section.selected-item(v-if="selected" aria-label="Описание предмета")
      .item-meta
        font-awesome-icon(:icon="items.get(selected.item_id)?.icon || 'cube'")
        small {{ rarities[items.get(selected.item_id)?.rarity || 'common'] }}
        strong {{ items.get(selected.item_id)?.name }} · {{ selected.quantity }} шт.
      p {{ items.get(selected.item_id)?.description }}
      p(v-if="items.get(selected.item_id)?.storage_kind === 'elixir'") +{{ state.inventory_settings?.elixir_slots }} слотов на {{ state.inventory_settings?.elixir_days }} дней
      .use-item(v-if="usable")
        n-input-number(:min="1" :max="Math.min(10000, selected.quantity)" :step="1" :input-props="{type: 'number', inputmode: 'numeric', min: 1, max: Math.min(10000, selected.quantity), step: 1}" v-model:value="useQuantity" :precision="0" :disabled="blocked" aria-label="Количество используемых предметов")
        n-button(:disabled="blocked || !useQuantity || useQuantity > selected.quantity" @click="use") Использовать
      .use-item(v-if="!inBackpack || (chest && items.get(selected.item_id)?.storage_kind !== 'chest')")
        n-input-number(:min="1" :max="Math.min(10000, selected.quantity)" :step="1" :input-props="{type: 'number', inputmode: 'numeric', min: 1, max: Math.min(10000, selected.quantity), step: 1}" v-model:value="moveQuantity" :precision="0" :disabled="blocked" aria-label="Количество перемещаемых предметов")
        n-button(v-if="inBackpack && chest" :disabled="blocked || !movable || chest.durability < 1" @click="moveSelected(chest.id)") В сундук
        n-button(v-else :disabled="blocked || !movable" @click="moveSelected(0)") В инвентарь
    section.chest-panel(v-if="chest" aria-label="Сундук")
      .chest-header
        strong Сундук · {{ chest.slots.length }} / {{ chest.capacity }}
        span.durability(:aria-label="'Прочность: ' + chest.durability + ' из ' + chest.max_durability" title="Прочность сундука")
          font-awesome-icon(icon="shield-halved" aria-hidden="true")
          span.durability-label Прочность
          |  {{ chest.durability }} / {{ chest.max_durability }}
      craft-slot-grid.chest-grid(:slots="chest.slots" :count="chest.capacity" :active="chest.capacity" :items="items" :selected="selected" :blocked="blocked" :target="overSlot?.container === chest.id ? overSlot.position : undefined" :dragging="drag?.moving ? drag.slotId : undefined" label="Содержимое сундука" @element="(position, element) => slotElement(chest.id, position, element)" @choose="select" @down="down" @move="move" @up="up" @cancel="cancel" @destination="position => destination(chest.id, position)")
      p(v-if="chest.durability === 0") Сундук изношен. Содержимое можно забрать.
      p.mobile-transfer-hint Выберите предмет слева, затем свободный слот сундука — или перетащите его.
      details.repair-details(v-if="repair && repair.restore > 0")
        summary Починить сундук
        p Материалы зависят от повреждения. Полный ремонт стоит половину материалов для создания.
        ul
          li(v-for="material in repair.materials" :key="material.item_id" :class="{missing: material.available === false || material.have < material.quantity}") {{ items.get(material.item_id)?.name }}: {{ material.have }} / {{ material.quantity }}
          li(v-for="tool in repair.tools" :key="tool.item_id" :class="{missing: tool.available === false}")
            | {{ items.get(tool.item_id)?.name }}: прочность {{ tool.durability }} / {{ tool.max_durability }} (−1 за ремонт)
            span(v-if="tool.available === false") · не хватает
          li(v-if="repair.station" :class="{missing: repair.station.available === false}")
            | Станция: {{ repair.station.name }}
            span(v-if="repair.station.durability !== undefined") : прочность {{ repair.station.durability }} / {{ repair.station.max_durability }} (−1 за ремонт)
            span(v-if="repair.station.available === false") · не хватает
        p(v-for="reason in repair.reasons" :key="reason" role="status") {{ reason }}
        n-button(size="small" :disabled="blocked || !!repair.reasons.length" @click="repairChest") Починить (+{{ repair.restore }})
  .drag-preview(v-if="drag?.moving" :style="{left: drag.x + 12 + 'px', top: drag.y + 12 + 'px'}" aria-hidden="true")
    font-awesome-icon(icon="cube")
  n-modal(v-model:show="showDiscard" preset="dialog" title="Удалить предметы?" positive-text="Удалить" negative-text="Отмена" :positive-button-props="{disabled: !validDiscard, type: 'error'}" @positive-click="confirmDiscard")
    template(v-if="discarded")
      p {{ items.get(discarded.item_id)?.name }}. Удалённые предметы нельзя восстановить.
      n-input-number(:min="1" :max="Math.min(10000, discarded.quantity)" :step="1" :input-props="{type: 'number', inputmode: 'numeric', min: 1, max: Math.min(10000, discarded.quantity), step: 1}" v-model:value="discardQuantity" :precision="0" :disabled="blocked" aria-label="Количество удаляемых предметов")
  n-modal(v-model:show="showBuy" preset="dialog" title="Открыть постоянные слоты" positive-text="Купить" negative-text="Отмена" :positive-button-props="{disabled: !validBuy}" @positive-click="buy")
    p Следующий слот: {{ quotedPrice }} Cr
    p(v-if="quotedLinear && quotedBase") Каждый следующий слот дороже на {{ quotedBase }} Cr.
    n-input-number(:min="1" :max="50 - permanent" :step="1" :input-props="{type: 'number', inputmode: 'numeric', min: 1, max: 50 - permanent, step: 1}" v-model:value="buyQuantity" :precision="0" :disabled="blocked" aria-label="Количество покупаемых слотов")
    p Будет списано {{ Number.isFinite(quotedTotal) ? quotedTotal : '—' }} Cr. Слоты останутся активными постоянно.
</template>
<style scoped>
.craft-inventory { display: grid; grid-template-columns: minmax(0, 760px) minmax(240px, 380px); align-items: start; gap: 1rem; max-width: 100%; }
.inventory-scroll { min-width: 0; }.inventory-status, .chest-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem; margin-bottom: .6rem; }
.trash-cell { aspect-ratio: 1; }.trash-target { display: grid; place-items: center; width: 100%; height: 100%; padding: .3rem; border-radius: .4rem; border: 1px dashed #b44a4a; background: #351f22; color: #f87171; cursor: pointer; }.trash-target.over { background: #712929; box-shadow: inset 0 0 0 2px #ef4444; }
.inventory-details { display: grid; gap: .75rem; min-width: 0; }
.selected-item, .chest-panel { display: grid; gap: .8rem; min-width: 0; padding: .8rem; border-radius: .6rem; border: 1px solid var(--border); background: var(--bg-surface); }
.selected-item p, .chest-panel p { margin: 0; color: var(--text-muted); font-size: .85rem; }.item-meta { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; }.item-meta strong { flex-basis: 100%; }.item-meta svg { color: #d6b685; font-size: .9rem; }.item-meta small { color: var(--text-muted); }
.durability { display: flex; align-items: center; gap: .3rem; white-space: nowrap; font-variant-numeric: tabular-nums; }
.mobile-transfer-hint { display: none; }.repair-details summary { cursor: pointer; }.repair-details ul { padding-left: 1rem; font-size: .8rem; }.repair-details p { margin: .4rem 0; }
.repair-details .missing { color: #f87171; }
.chest-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }.use-item { display: flex; gap: .5rem; }.use-item > * { min-width: 0; }
.overflow-items { display: flex; flex-wrap: wrap; gap: .5rem; }.overflow-items p { flex-basis: 100%; }.overflow-items .slot-item { width: 90px; min-height: 70px; color: var(--text); background: var(--bg-surface); border: 1px solid var(--border); border-radius: .4rem; touch-action: none; }.overflow-items .matching { background: #3b3523; }
.drag-preview { position: fixed; pointer-events: none; z-index: 2000; padding: .7rem; background: #493c29; border-radius: .5rem; color: #f2d39d; }button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
@media(max-width: 850px) {
  .craft-inventory { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: .5rem; }
  .inventory-scroll :deep(.inventory-grid) { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 3px; }
  .chest-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px; }
  .inventory-details { position: sticky; top: calc(var(--site-header-height, 60px) + 8px); }
  .chest-panel { order: -1; }.selected-item, .chest-panel { padding: .4rem; gap: .5rem; }
  .durability-label { display: none; }.chest-header { font-size: .75rem; gap: .3rem; margin: 0; }
  .mobile-transfer-hint { display: block; }.chest-panel .mobile-transfer-hint { font-size: .65rem; }
  .use-item { flex-direction: column; }.inventory-status { font-size: .75rem; }
}
</style>

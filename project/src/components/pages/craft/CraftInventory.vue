<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NButton, NInputNumber, NModal, NPopover } from 'naive-ui';
import type { CraftState, CraftSlot } from '@/services/api/classicCraft';
import { inventoryCells, insideTrash, INVENTORY_CELLS } from '@/entities/craft/inventory';
const props = defineProps<{state: CraftState; blocked: boolean}>();
const emit = defineEmits<{command: [action: 'use' | 'discard', id: number, quantity: number, slotId: number]}>();
const items = computed(() => new Map(props.state.items.map(i => [i.id, i])));
// The basket occupies the next empty display cell; a full inventory still shows all 100 stacks.
const cells = computed(() => inventoryCells(props.state.inventory_slots).slice(0, props.state.inventory_slots.length >= INVENTORY_CELLS ? INVENTORY_CELLS : INVENTORY_CELLS - 1));
const trashOrder = computed(() => Math.min(props.state.inventory_slots.length, INVENTORY_CELLS) * 2 - 1);
const overflow = computed(() => props.state.inventory_slots.slice(INVENTORY_CELLS));
const selectedId = ref<number | null>(null), discardId = ref<number | null>(null);
const selected = computed(() => props.state.inventory_slots.find(s => s.id === selectedId.value));
const discarded = computed(() => props.state.inventory_slots.find(s => s.id === discardId.value));
const discardQuantity = ref<number | null>(1), useQuantity = ref<number | null>(1);
const showDiscard = computed({get: () => !!discarded.value, set: value => { if (!value) discardId.value = null; }});
const trash = ref<HTMLElement>();
const drag = ref<{slotId: number; pointerId: number; startX: number; startY: number; x: number; y: number; moving: boolean} | null>(null);
const overTrash = ref(false);
let suppressClick = false;
const rarities: Record<string, string> = {common: 'Обычный', uncommon: 'Необычный', rare: 'Редкий', epic: 'Эпический', legendary: 'Легендарный'};
const label = (slot: CraftSlot) => `${items.value.get(slot.item_id)?.name || 'Предмет'}: ${slot.quantity} шт.`;
const canDiscard = (slot: CraftSlot) => !props.blocked && !!items.value.get(slot.item_id)?.destroyable;
function down(event: PointerEvent, slot: CraftSlot) {
  if (event.button !== 0 || !canDiscard(slot) || drag.value) return;
  suppressClick = false;
  drag.value = {slotId: slot.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moving: false};
  (event.currentTarget as Element).setPointerCapture(event.pointerId);
}
function move(event: PointerEvent) {
  if (!drag.value || drag.value.pointerId !== event.pointerId) return;
  drag.value.x = event.clientX; drag.value.y = event.clientY;
  if (Math.hypot(event.clientX - drag.value.startX, event.clientY - drag.value.startY) > 6) drag.value.moving = true;
  const rect = trash.value?.getBoundingClientRect();
  overTrash.value = !!rect && drag.value.moving && insideTrash(drag.value, rect);
}
function requestDiscard(slot: CraftSlot) {
  if (!canDiscard(slot)) return;
  discardId.value = slot.id; discardQuantity.value = Math.min(10000, slot.quantity);
}
function cancel() { drag.value = null; overTrash.value = false; }
function up(event: PointerEvent) {
  if (!drag.value || drag.value.pointerId !== event.pointerId) return;
  move(event);
  suppressClick = drag.value.moving;
  const slot = props.state.inventory_slots.find(s => s.id === drag.value?.slotId);
  if (slot && overTrash.value) requestDiscard(slot);
  cancel();
}
function select(event: MouseEvent, slot: CraftSlot) {
  if (suppressClick && event.detail !== 0) { suppressClick = false; return; }
  selectedId.value = slot.id; useQuantity.value = 1;
}
const validDiscard = computed(() => !!discarded.value && canDiscard(discarded.value) && Number.isSafeInteger(discardQuantity.value) && Number(discardQuantity.value) >= 1 && Number(discardQuantity.value) <= Math.min(10000, discarded.value.quantity));
function confirmDiscard() {
  if (!validDiscard.value || !discarded.value) return false;
  emit('command', 'discard', discarded.value.item_id, discardQuantity.value!, discarded.value.id);
  discardId.value = null;
}
function use() {
  const slot = selected.value, qty = useQuantity.value;
  if (slot && !props.blocked && qty && Number.isSafeInteger(qty) && qty > 0 && qty <= Math.min(10000, slot.quantity) && items.value.get(slot.item_id)?.active && items.value.get(slot.item_id)?.use_xp) emit('command', 'use', slot.item_id, qty, slot.id);
}
watch(() => props.blocked, blocked => { if (blocked) cancel(); });
</script>
<template lang="pug">
.craft-inventory
  .inventory-scroll
    .inventory-grid(aria-label="Инвентарь: 10 на 10 слотов" role="list")
      .inventory-cell(v-for="(slot, index) in cells" :key="slot?.id || 'empty-' + index" role="listitem" :style="{order: index * 2}")
        n-popover(v-if="slot" trigger="hover" :disabled="!!drag?.moving")
          template(#trigger)
            button.slot-item(type="button" :class="{selected: selectedId === slot.id, dragging: drag?.moving && drag.slotId === slot.id}" :aria-label="label(slot)" :aria-pressed="selectedId === slot.id" :disabled="blocked" @pointerdown="down($event, slot)" @pointermove="move" @pointerup="up" @pointercancel="cancel" @lostpointercapture="cancel" @click="select($event, slot)")
              font-awesome-icon(:icon="items.get(slot.item_id)?.icon || 'cube'")
              span.slot-name {{ items.get(slot.item_id)?.name }}
              strong.slot-count {{ slot.quantity }}
          .slot-description
            .item-meta
              font-awesome-icon(:icon="items.get(slot.item_id)?.icon || 'cube'")
              small {{ rarities[items.get(slot.item_id)?.rarity || 'common'] }}
            strong {{ items.get(slot.item_id)?.name }}
            p {{ items.get(slot.item_id)?.description }}
            span {{ slot.quantity }} шт.
        .empty-slot(v-else :aria-label="'Пустой слот ' + (index + 1)")
      .inventory-cell.trash-cell(role="listitem" :style="{order: trashOrder}")
        button.trash-target(ref="trash" type="button" :class="{over: overTrash}" :disabled="blocked" title="Корзина" :aria-label="selected && canDiscard(selected) ? 'Переместить выбранный предмет в корзину' : 'Корзина: перетащите предмет или выберите его и нажмите Enter здесь'" @click="selected && requestDiscard(selected)")
          font-awesome-icon(icon="trash-alt")
  .overflow-items(v-if="overflow.length")
    p Предметы сверх нового лимита сохранены. Освободите слоты, чтобы получать новые стопки.
    button.slot-item(v-for="slot in overflow" :key="slot.id" type="button" :aria-label="label(slot)" :disabled="blocked" @pointerdown="down($event, slot)" @pointermove="move" @pointerup="up" @pointercancel="cancel" @lostpointercapture="cancel" @click="select($event, slot)")
      font-awesome-icon(:icon="items.get(slot.item_id)?.icon || 'cube'")
      span {{ items.get(slot.item_id)?.name }} × {{ slot.quantity }}
  aside.selected-item(v-if="selected" aria-label="Описание предмета")
    .item-meta
      font-awesome-icon(:icon="items.get(selected.item_id)?.icon || 'cube'")
      small {{ rarities[items.get(selected.item_id)?.rarity || 'common'] }}
      strong {{ items.get(selected.item_id)?.name }} · {{ selected.quantity }} шт.
    p {{ items.get(selected.item_id)?.description }}
    .use-item(v-if="items.get(selected.item_id)?.use_xp")
      label Количество
        n-input-number(v-model:value="useQuantity" :min="1" :max="Math.min(10000, selected.quantity)" :precision="0" :disabled="blocked")
      n-button(:disabled="blocked || !useQuantity || useQuantity > selected.quantity || !items.get(selected.item_id)?.active" @click="use") Использовать
  .drag-preview(v-if="drag?.moving" :style="{left: drag.x + 12 + 'px', top: drag.y + 12 + 'px'}" aria-hidden="true")
    font-awesome-icon(icon="cube")
  n-modal(v-model:show="showDiscard" preset="dialog" title="Удалить предметы?" positive-text="Удалить" negative-text="Отмена" :positive-button-props="{disabled: !validDiscard, type: 'error'}" @positive-click="confirmDiscard")
    template(v-if="discarded")
      p {{ items.get(discarded.item_id)?.name }}. Удалённые предметы нельзя восстановить.
      label Количество
        n-input-number(v-model:value="discardQuantity" :min="1" :max="Math.min(10000, discarded.quantity)" :precision="0" :disabled="blocked" aria-label="Количество удаляемых предметов")
</template>
<style scoped lang="scss">
.craft-inventory { display: grid; grid-template-columns: minmax(520px, 760px) minmax(220px, 280px); align-items: start; gap: 1rem; overflow-x: auto; max-width: 100%; }
.inventory-scroll { grid-column: 1; grid-row: 1; min-width: 0; }.inventory-grid { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 5px; }.inventory-cell { min-width: 0; aspect-ratio: 1; }
.slot-item, .empty-slot, .trash-target { box-sizing: border-box; width: 100%; height: 100%; border-radius: .4rem; border: 1px solid var(--border); background: var(--bg-surface); }
.empty-slot { background: #ffffff03; border-style: dashed; }.slot-item { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .1rem; padding: .2rem; color: var(--text); cursor: grab; touch-action: none; user-select: none; }.slot-item > svg { font-size: .85rem; color: #d6b685; flex-shrink: 0; }.slot-item.selected { border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }.slot-item.dragging { opacity: .4; cursor: grabbing; }.slot-item:disabled { cursor: default; opacity: .6; }
.slot-name { font-size: .76rem; font-weight: 600; line-height: 1.15; max-width: 100%; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }.slot-count { align-self: flex-end; font-size: .65rem; line-height: 1; background: var(--bg-surface); }
.trash-target { display: grid; place-items: center; padding: .3rem; border: 1px dashed #b44a4a; background: #351f22; color: #f87171; cursor: pointer; }.trash-target svg { font-size: 1rem; }.trash-target.over { border-style: solid; background: #712929; color: white; box-shadow: inset 0 0 0 2px #ef4444; }.trash-target:disabled { opacity: .5; cursor: default; }
.item-meta { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; }.item-meta svg { color: #d6b685; font-size: .9rem; }.item-meta small { color: var(--text-muted); }.slot-description { display: grid; gap: .4rem; max-width: 270px; }.slot-description p, .selected-item p { margin: 0; color: var(--text-muted); font-size: .85rem; }.selected-item { grid-column: 2; grid-row: 1 / 3; display: grid; gap: .8rem; padding: 1rem; border-radius: .6rem; border: 1px solid var(--border); background: var(--bg-surface); }.selected-item .item-meta strong { flex-basis: 100%; font-size: 1rem; }
.use-item { display: grid; gap: .7rem; }.use-item label { font-size: .8rem; }.overflow-items { grid-column: 1; display: flex; flex-wrap: wrap; gap: .5rem; }.overflow-items p { flex-basis: 100%; }.overflow-items .slot-item { width: 90px; min-height: 70px; font-size: .75rem; }.drag-preview { position: fixed; pointer-events: none; z-index: 2000; padding: .7rem; background: #493c29; border-radius: .5rem; color: #f2d39d; }button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
@media(max-width: 760px) { .craft-inventory { grid-template-columns: 520px 220px; gap: .75rem; }.slot-name { font-size: .72rem; }.slot-count { font-size: .6rem; } }
</style>

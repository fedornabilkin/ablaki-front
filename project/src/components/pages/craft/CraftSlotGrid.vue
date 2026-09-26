<script setup lang="ts">
import { computed } from 'vue';
import { NPopover } from 'naive-ui';
import type { CraftItem, CraftSlot } from '@/services/api/classicCraft';
import { inventoryCells } from '@/entities/craft/inventory';
const props = defineProps<{ slots: CraftSlot[]; count: number; active: number; items: Map<number, CraftItem>; selected?: CraftSlot; blocked: boolean; target?: number; dragging?: number; label: string }>();
const emit = defineEmits<{ element: [position: number, element: unknown]; choose: [event: MouseEvent, slot: CraftSlot]; down: [event: PointerEvent, slot: CraftSlot]; move: [event: PointerEvent]; up: [event: PointerEvent]; cancel: []; destination: [position: number]; unlock: [position: number] }>();
const cells = computed(() => inventoryCells(props.slots, props.count));
</script>
<template lang="pug">
.inventory-grid(:aria-label="label" role="list")
  .inventory-cell(v-for="(slot, index) in cells" :key="index" role="listitem" :ref="element => emit('element', index + 1, element)" :class="{'drop-target': target === index + 1, locked: index >= active, matching: slot && selected && slot.id !== selected.id && slot.item_id === selected.item_id}")
    n-popover(v-if="slot" trigger="hover" :disabled="!!dragging")
      template(#trigger)
        button.slot-item(type="button" :class="{selected: selected?.id === slot.id, dragging: dragging === slot.id}" :aria-label="(items.get(slot.item_id)?.name || 'Предмет') + ': ' + slot.quantity + ' шт.' + (index >= active ? '. Слот закрыт, предмет сохранён' : '')" :aria-pressed="selected?.id === slot.id" :disabled="blocked" aria-keyshortcuts="Shift+Enter" @keydown.shift.enter.prevent="emit('destination', index + 1)" @pointerdown="emit('down', $event, slot)" @pointermove="emit('move', $event)" @pointerup="emit('up', $event)" @pointercancel="emit('cancel')" @lostpointercapture="emit('cancel')" @click="emit('choose', $event, slot)")
          font-awesome-icon(:icon="items.get(slot.item_id)?.icon || 'cube'" aria-hidden="true")
          span.slot-name {{ items.get(slot.item_id)?.name }}
          strong.slot-count {{ slot.quantity }}
          font-awesome-icon.slot-lock(v-if="index >= active" icon="lock" aria-hidden="true")
      strong {{ items.get(slot.item_id)?.name }}
      p {{ items.get(slot.item_id)?.description }}
      p(v-if="index >= active") Слот закрыт. Предмет сохранён и займёт освободившийся активный слот.
    button.empty-slot(v-else type="button" :disabled="blocked" :aria-label="index >= active ? 'Открыть слот ' + (index + 1) : 'Пустой слот ' + (index + 1)" @click="index >= active ? emit('unlock', index + 1) : emit('destination', index + 1)")
      font-awesome-icon(v-if="index >= active" icon="lock" aria-hidden="true")
  slot
</template>
<style scoped>
.inventory-grid { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 5px; }
.inventory-cell { min-width: 0; aspect-ratio: 1; border-radius: .4rem; }
.slot-item, .empty-slot { box-sizing: border-box; width: 100%; height: 100%; border-radius: .4rem; border: 1px solid var(--border); background: var(--bg-surface); color: var(--text); }
.slot-item { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .1rem; padding: .2rem; cursor: grab; touch-action: none; user-select: none; }
.slot-item > svg { font-size: .85rem; color: #d6b685; flex-shrink: 0; }
.slot-name { font-size: .76rem; font-weight: 600; line-height: 1.15; max-width: 100%; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.slot-count { align-self: flex-end; font-size: .65rem; line-height: 1; }
.slot-item.selected { border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
.slot-item.dragging { opacity: .4; }.empty-slot { background: #ffffff03; border-style: dashed; cursor: pointer; }
.locked { opacity: .7; }.locked .empty-slot { color: #a98c61; background: #322c23; }
.slot-item .slot-lock { position: absolute; left: .2rem; top: .2rem; font-size: .5rem; }
.matching .slot-item { background: #3b3523; box-shadow: inset 0 0 0 1px #d6b68580; }
.drop-target { outline: 2px solid #4ade80; }.drop-target .slot-item, .drop-target .empty-slot { background: #203329; }
button:disabled { cursor: default; opacity: .6; }button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
@media(max-width: 850px) { .slot-name { display: none; }.slot-item { min-height: 30px; }.slot-item > svg { font-size: .75rem; }.slot-count { font-size: .6rem; }.inventory-cell { min-height: 30px; } }
</style>

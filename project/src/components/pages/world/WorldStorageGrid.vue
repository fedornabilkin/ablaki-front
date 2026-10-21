<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { StorageView } from '@/services/api/worldStorage';
import { storageCells, type StorageMapContext } from '@/entities/world/storageInteraction';
import { nodeIcons } from '@/entities/world/types';
import { formatCredits } from '@/entities/world/credits';
const props = defineProps<{ view: StorageView; context?: StorageMapContext | null; selected: number | null; blocked: boolean; dragging?: number | null; target?: string | null; destinations: number[] }>();
const emit = defineEmits<{ choose: [position: number]; down: [event: PointerEvent, position: number]; move: [event: PointerEvent]; up: [event: PointerEvent]; cancel: [] }>();
const page = ref(1);
const count = computed(() => Math.max(props.view.storage.capacity, ...props.view.items.map(item => item.position)));
const pages = computed(() => Math.max(1, Math.ceil(count.value / 100)));
const cells = computed(() => storageCells(props.view, page.value, props.context));
watch(() => props.view.storage.id, () => { page.value = 1; });
watch(pages, value => { page.value = Math.min(page.value, value); });
const exposure: Record<string, string> = { outdoor: 'На улице', covered: 'Под навесом', indoor: 'В помещении', carried: 'В рюкзаке' };
</script>
<template lang="pug">
.storage-grid-panel
  .storage-grid(role="group" :aria-label="view.storage.name")
    button.storage-cell(v-for="cell in cells" :key="cell.position" type="button" :data-storage="view.storage.id" :data-position="cell.position" :data-drop="(cell.available && destinations.includes(cell.position)) ? 'true' : undefined" :class="{ selected: cell.item?.id === selected, locked: !cell.available, purchase: cell.purchase, occupied: !!cell.object, destination: (cell.available && destinations.includes(cell.position)), dragging: dragging === cell.item?.id, 'drop-target': target === `${view.storage.id}:${cell.position}` }" :disabled="blocked || (!cell.item && (!cell.available || !!cell.object))" :aria-pressed="Boolean(cell.item && selected === cell.item.id)" :aria-label="`${cell.item ? cell.item.name + ', ' + cell.item.quantity + ' шт.' : cell.object?.label || 'Пустое место'}, ячейка ${cell.position}. ${cell.object ? 'Недоступно для размещения' : cell.purchase ? 'К покупке' : cell.available ? 'Доступна' : 'Закрыта'}`" @click="emit('choose', cell.position)" @pointerdown="emit('down', $event, cell.position)" @pointermove="emit('move', $event)" @pointerup="emit('up', $event)" @pointercancel="emit('cancel')" @lostpointercapture="emit('cancel')")
      .cell-top(v-if="cell.item || !cell.available")
        font-awesome-icon(:icon="cell.item?.icon || (cell.object ? nodeIcons[cell.object.type] : cell.available ? 'plus' : cell.purchase ? 'bag-shopping' : 'lock')" aria-hidden="true")
        strong(v-if="cell.item") ×{{ cell.item.quantity }}
        small(v-else) {{ cell.position }}
      strong.cell-name(v-if="cell.item || !cell.available") {{ cell.item?.name || cell.object?.label || (cell.purchase ? 'К покупке' : 'Закрыто') }}
      strong.cell-price(v-if="cell.purchase && cell.price !== null") {{ formatCredits(cell.price) }} Cr
      small.cell-state(v-if="cell.item || !cell.available") {{ cell.object ? 'Недоступно для размещения' : cell.purchase ? `${cell.point?.x}, ${cell.point?.y}` : !cell.available ? (cell.item ? 'Можно забрать' : 'Недоступно') : cell.exposure ? exposure[cell.exposure] : 'В наличии' }}
  router-link(v-if="context && cells.some(cell => cell.purchase)" :to="`/world/nodes/${context.map.node_id}#map`") Купить ячейки на карте
  nav.cell-pages(v-if="pages > 1" aria-label="Страницы ячеек")
    button.world-action(type="button" :disabled="page <= 1 || blocked" @click="page--") ← Назад
    span {{ page }} / {{ pages }}
    button.world-action(type="button" :disabled="page >= pages || blocked" @click="page++") Далее →
</template>
<style scoped>
.storage-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: .45rem; padding: 3px; }
.storage-cell { display: flex; flex-direction: column; gap: .4rem; min-height: 100px; min-width: 0; padding: .55rem; border: 1px solid var(--border); border-radius: .5rem; background: var(--bg-base); color: var(--text); text-align: left; cursor: pointer; touch-action: none; user-select: none; }
.cell-top { display: flex; justify-content: space-between; gap: .3rem; align-items: center; }
.cell-top svg { color: var(--primary); font-size: 1.25rem; }
.cell-top strong, .cell-state { font-size: .7rem; }.cell-name { font-size: .8rem; overflow-wrap: anywhere; }.cell-state { margin-top: auto; color: var(--text-muted); }
.storage-cell.selected { background: var(--primary-soft); }.storage-cell.destination { border-style: dashed; border-color: var(--primary); }
.storage-cell.occupied:disabled { opacity: 1; cursor: default; }.storage-cell.occupied .cell-state { color: var(--text-muted); }
.storage-cell.purchase:disabled { border-color: var(--primary); background: var(--primary-soft); opacity: 1; }.cell-price { color: var(--primary); font-size: .85rem; }
.storage-cell.drop-target { outline: 3px solid var(--primary); background: var(--primary-soft); }.storage-cell.dragging { opacity: .45; }.storage-cell.locked { background: var(--bg-surface); border-style: solid; }.storage-cell:focus-visible { outline: 2px solid var(--primary); }.storage-cell:disabled { cursor: default; opacity: .6; }
.cell-pages { display: flex; align-items: center; justify-content: space-between; gap: .5rem; margin-top: .5rem; }.cell-pages button { padding: .4rem; color: var(--text); background: var(--bg-surface); border: 1px solid var(--border); border-radius: .3rem; }
.storage-cell.locked:disabled { background-image: repeating-linear-gradient(135deg, transparent 0 7px, rgba(128,128,128,.09) 7px 14px); }
@media(pointer: coarse) { .storage-cell { touch-action: pan-y; } }
</style>

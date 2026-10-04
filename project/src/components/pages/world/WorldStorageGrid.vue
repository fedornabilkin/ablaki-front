<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { StorageView } from '@/services/api/worldStorage';
import { storageCells } from '@/entities/world/storageInteraction';
const props = defineProps<{ view: StorageView; selected: number | null; blocked: boolean; dragging?: number | null; target?: string | null; destinations: number[] }>();
const emit = defineEmits<{ choose: [position: number]; down: [event: PointerEvent, position: number]; move: [event: PointerEvent]; up: [event: PointerEvent]; cancel: [] }>();
const page = ref(1);
const count = computed(() => Math.max(props.view.storage.capacity, ...props.view.items.map(item => item.position)));
const pages = computed(() => Math.max(1, Math.ceil(count.value / 100)));
const cells = computed(() => storageCells(props.view, page.value));
watch(() => props.view.storage.id, () => { page.value = 1; });
watch(pages, value => { page.value = Math.min(page.value, value); });
const exposure: Record<string, string> = { outdoor: 'На улице', covered: 'Под навесом', indoor: 'В помещении', carried: 'В рюкзаке' };
</script>
<template lang="pug">
.storage-grid-panel
  .storage-grid(role="group" :aria-label="view.storage.name")
    button.storage-cell(v-for="cell in cells" :key="cell.position" type="button" :data-storage="view.storage.id" :data-position="cell.position" :data-drop="destinations.includes(cell.position) ? 'true' : undefined" :class="{ selected: cell.item?.id === selected, locked: !cell.available, destination: destinations.includes(cell.position), dragging: dragging === cell.item?.id, 'drop-target': target === `${view.storage.id}:${cell.position}` }" :disabled="blocked" :aria-pressed="Boolean(cell.item && selected === cell.item.id)" :aria-label="`${cell.item ? cell.item.name + ', ' + cell.item.quantity + ' шт.' : 'Пустое место'}, ячейка ${cell.position}. ${cell.available ? 'Доступна' : 'Закрыта'}`" @click="emit('choose', cell.position)" @pointerdown="emit('down', $event, cell.position)" @pointermove="emit('move', $event)" @pointerup="emit('up', $event)" @pointercancel="emit('cancel')" @lostpointercapture="emit('cancel')")
      .cell-top
        font-awesome-icon(:icon="cell.item?.icon || (cell.available ? 'plus' : 'lock')" aria-hidden="true")
        strong(v-if="cell.item") ×{{ cell.item.quantity }}
        small(v-else) {{ cell.position }}
      strong.cell-name {{ cell.item?.name || (cell.available ? 'Свободно' : 'Закрыто') }}
      small.cell-state {{ !cell.available ? (cell.item ? 'Можно забрать' : 'Недоступно') : cell.exposure ? exposure[cell.exposure] : cell.item ? 'В наличии' : 'Доступно' }}
  nav.cell-pages(v-if="pages > 1" aria-label="Страницы ячеек")
    button(type="button" :disabled="page <= 1 || blocked" @click="page--") ← Назад
    span {{ page }} / {{ pages }}
    button(type="button" :disabled="page >= pages || blocked" @click="page++") Далее →
</template>
<style scoped>
.storage-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: .45rem; padding: 3px; }
.storage-cell { display: flex; flex-direction: column; gap: .4rem; min-height: 100px; min-width: 0; padding: .55rem; border: 1px solid var(--border); border-radius: .5rem; background: var(--bg-base); color: var(--text); text-align: left; cursor: pointer; touch-action: none; user-select: none; }
.cell-top { display: flex; justify-content: space-between; gap: .3rem; align-items: center; }
.cell-top svg { color: var(--primary); font-size: 1.25rem; }
.cell-top strong, .cell-state { font-size: .7rem; }.cell-name { font-size: .8rem; overflow-wrap: anywhere; }.cell-state { margin-top: auto; color: var(--text-muted); }
.storage-cell.selected { outline: 2px solid var(--primary); background: var(--primary-soft); }.storage-cell.destination { border-style: dashed; border-color: var(--primary); }
.storage-cell.drop-target { outline: 3px solid var(--primary); background: var(--primary-soft); }.storage-cell.dragging { opacity: .45; }.storage-cell.locked { background: var(--bg-surface); border-style: dashed; }.storage-cell:focus-visible { outline: 2px solid var(--primary); }.storage-cell:disabled { cursor: default; opacity: .6; }
.cell-pages { display: flex; align-items: center; justify-content: space-between; gap: .5rem; margin-top: .5rem; }.cell-pages button { padding: .4rem; color: var(--text); background: var(--bg-surface); border: 1px solid var(--border); border-radius: .3rem; }
@media(pointer: coarse) { .storage-cell { touch-action: pan-y; } }
</style>

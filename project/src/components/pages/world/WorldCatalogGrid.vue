<script setup lang="ts">
import WorldSlotGrid from './WorldSlotGrid.vue';
defineProps<{ label: string }>();
</script>
<template lang="pug">
world-slot-grid.world-catalog-grid(:label="label")
  slot
</template>
<style scoped>
.world-catalog-grid :deep(.catalog-tile-wrap) { position: relative; display: grid; min-width: 0; }
.world-catalog-grid :deep(.catalog-tile) { display: grid; gap: .4rem; align-content: start; justify-items: start; min-width: 0; min-height: 7.5rem; width: 100%; height: 100%; padding: .65rem; border: 1px solid var(--border); border-radius: .6rem; color: var(--text); background: var(--bg-surface); font: inherit; font-size: .8125rem; line-height: 1.4; text-align: left; overflow-wrap: anywhere; cursor: pointer; transition: border-color 160ms ease, background-color 160ms ease; }
.world-catalog-grid :deep(.catalog-tile > svg) { color: var(--primary); font-size: 1.3rem; margin-right: 1.75rem; }
.world-catalog-grid :deep(.catalog-tile > strong) { font-size: .8125rem; }
.world-catalog-grid :deep(.catalog-tile small) { font-size: .75rem; color: var(--text-muted); }
.world-catalog-grid :deep(.catalog-tile.ready) { background: linear-gradient(145deg, #4ebc8524, #4ebc8504); border-color: #4ebc8555; }
.world-catalog-grid :deep(.catalog-tile.shortage) { background: linear-gradient(145deg, #d5677124, #d5677104); border-color: #d567714a; }
.world-catalog-grid :deep(.catalog-tile.unavailable), .world-catalog-grid :deep(.catalog-tile.locked) { background: repeating-linear-gradient(135deg, #ffffff06 0 6px, transparent 6px 12px); color: var(--text-muted); }
.world-catalog-grid :deep(.catalog-tile.selected), .world-catalog-grid :deep(.catalog-tile:hover:not(:disabled)) { border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
.world-catalog-grid :deep(.catalog-tile:disabled) { cursor: default; }
.world-catalog-grid :deep(.catalog-tile:focus-visible) { outline: 2px solid var(--primary); outline-offset: 1px; }
@media(prefers-reduced-motion: reduce) { .world-catalog-grid :deep(.catalog-tile) { transition: none; } }
</style>

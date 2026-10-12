<script setup lang="ts">
import { computed } from 'vue';
import type { WorldNode } from '@/entities/world/types';
import { occupiesCell } from '@/entities/world/coordinates';
const props = defineProps<{ node: WorldNode }>();
const layout = computed(() => {
  const points = [props.node.coordinates, ...(props.node.footprint ?? [])];
  const minX = Math.min(...points.map(p => p.x)), minY = Math.min(...points.map(p => p.y));
  const maxX = Math.max(props.node.coordinates.x + 1, ...points.map(p => p.x)), maxY = Math.max(props.node.coordinates.y + 1, ...points.map(p => p.y));
  const cells = [];
  for (let y = minY; y < maxY; y++) for (let x = minX; x < maxX; x++) if (occupiesCell(props.node, { x, y })) cells.push({ x, y });
  return { minX, maxY, width: maxX - minX, height: maxY - minY, cells };
});
</script>
<template lang="pug">
figure.object-preview
  svg(:viewBox="`0 0 ${layout.width * 32} ${layout.height * 32}`" role="img" :aria-label="`${node.label}: занято ячеек — ${layout.cells.length}`")
    rect(v-for="cell in layout.cells" :key="`${cell.x}:${cell.y}`" :x="(cell.x - layout.minX) * 32 + 1" :y="(layout.maxY - cell.y - 1) * 32 + 1" width="30" height="30" rx="2")
  figcaption Занято ячеек: {{ layout.cells.length }}
</template>
<style scoped>
.object-preview { margin: 0; }.object-preview svg { display: block; max-width: 100%; width: 100%; height: 8rem; }.object-preview rect { fill: var(--primary-soft); stroke: var(--primary); }.object-preview figcaption { margin-top: .4rem; color: var(--text-muted); font-size: .85rem; }
</style>

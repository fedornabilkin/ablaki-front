<script setup lang="ts">
import { computed } from 'vue';
import type { WorldNode } from '@/entities/world/types';
import { nodeLabels } from '@/entities/world/types';
const props = defineProps<{ nodes: WorldNode[] }>();
// Sparse coordinates are compressed for a bounded viewport; links remain keyboard accessible.
const xs = computed(() => [...new Set(props.nodes.map(node => node.coordinates.x))].sort((a, b) => a - b));
const ys = computed(() => [...new Set(props.nodes.map(node => node.coordinates.y))].sort((a, b) => a - b));
const groups = computed(() => {
  const result = new Map<string, WorldNode[]>();
  for (const node of props.nodes) { const key = `${node.coordinates.x}:${node.coordinates.y}`; result.set(key, [...(result.get(key) ?? []), node]); }
  return [...result.values()];
});
</script>
<template lang="pug">
.world-map-scroll
  .world-map(:style="{ gridTemplateColumns: `repeat(${Math.max(1, xs.length)}, minmax(9rem, 1fr))` }" aria-label="Карта текущего уровня")
    .world-map-cell(v-for="group in groups" :key="`${group[0].coordinates.x}:${group[0].coordinates.y}`" :style="{ gridColumn: xs.indexOf(group[0].coordinates.x) + 1, gridRow: ys.indexOf(group[0].coordinates.y) + 1 }")
      router-link.world-map-link(v-for="node in group" :key="node.id" :to="`/world/nodes/${node.id}`")
        span.world-map-kind {{ nodeLabels[node.type] }}
        strong {{ node.name }}
        small {{ node.coordinates.x }}, {{ node.coordinates.y }} · Объектов: {{ node.child_count }}
</template>
<style scoped>
.world-map-scroll { overflow-x: auto; padding: .25rem; }
.world-map { display: grid; gap: .75rem; }
.world-map-cell { display: flex; flex-direction: column; gap: .5rem; }
.world-map-link { display: flex; flex-direction: column; gap: .4rem; min-height: 7rem; padding: .75rem; border: 1px solid var(--border); background: var(--bg-surface); border-radius: .5rem; text-decoration: none; overflow-wrap: anywhere; }
.world-map-link:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.world-map-kind, small { color: var(--text-muted); font-size: .85rem; }
</style>

<script setup lang="ts">
import { computed } from 'vue';
import type { StatPoint } from '@/services/api/statistics';
const props = defineProps<{ points?: StatPoint[]; label: string }>();
const maximum = computed(() => Math.max(1, ...(props.points ?? []).map(point => point.value)));
const summary = computed(() => (props.points ?? []).map(point => `${point.date}: ${point.value}`).join('; '));
</script>
<template lang="pug">
figure.stat-chart(v-if="points?.length")
  figcaption {{ label }} · 7 дней
  svg(viewBox="0 0 280 64" role="img" :aria-label="label + '. ' + summary")
    g(v-for="(point, index) in points" :key="point.date")
      title {{ point.date }}: {{ point.value }}
      rect(:x="index * 40 + 5" :y="54 - point.value / maximum * 48" width="30" :height="Math.max(1, point.value / maximum * 48)" rx="3")
      text(:x="index * 40 + 20" y="64" text-anchor="middle") {{ point.date.slice(8) }}
</template>
<style scoped>
.stat-chart { margin: .75rem 0 0; }
figcaption { font-size: .7rem; color: var(--text-muted); }
svg { display: block; width: 100%; height: 5rem; overflow: visible; }
rect { fill: var(--primary); opacity: .7; }
text { fill: var(--text-muted); font-size: 7px; }
</style>

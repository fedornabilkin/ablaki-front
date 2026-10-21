<script setup lang="ts">
import { computed } from 'vue';
import { creditUnits, formatCredits } from '@/entities/world/credits';
const props = defineProps<{ value: string | number; cost?: boolean }>();
const visible = computed(() => !props.cost || creditUnits(String(props.value)) > 0n);
</script>
<template lang="pug">
span.world-credits(v-if="visible" :class="{ 'world-credit-cost': cost }" :aria-label="`${formatCredits(value)} кредитов`")
  font-awesome-icon(icon="coins" aria-hidden="true")
  | {{ formatCredits(value) }}
</template>
<style scoped>
.world-credits { display: inline-flex; align-items: baseline; gap: .3em; white-space: nowrap; font-variant-numeric: tabular-nums; }.world-credits > svg { color: var(--primary); font-size: .85em; }.world-credit-cost { margin-left: .5em; }
</style>

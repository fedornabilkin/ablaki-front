<script setup lang="ts">
import { computed } from 'vue';
import { creditUnits, formatCredits, formatExactCredits } from '@/entities/world/credits';
const props = defineProps<{ value: string | number; cost?: boolean; exact?: boolean }>();
const display = computed(() => props.exact ? formatExactCredits(props.value) : formatCredits(props.value));
const visible = computed(() => !props.cost || creditUnits(String(props.value)) > 0n);
</script>
<template lang="pug">
span.world-credits(v-if="visible" :class="{ 'world-credit-cost': cost }" :aria-label="`${display} кредитов`")
  font-awesome-icon(icon="coins" aria-hidden="true")
  | {{ display }}
</template>
<style scoped>
.world-credits { display: inline-flex; align-items: baseline; gap: .25em; color: inherit; white-space: nowrap; font-variant-numeric: tabular-nums; }.world-credits > svg { color: currentColor; margin: 0; flex: none; font-size: .85em; }.world-credit-cost { margin-left: .5em; }
</style>

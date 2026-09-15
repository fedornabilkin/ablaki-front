<script setup lang="ts">
import { computed } from 'vue';
import { formatAccountNumber } from '@/services/api/header';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
const props = defineProps<{ value: unknown; identity?: unknown }>();
const { displayed, direction } = useAnimatedNumber(() => props.value, () => props.identity);
const text = computed(() => formatAccountNumber(displayed.value));
</script>
<template lang="pug">
strong.animated-number(:class="direction") {{ text }}
</template>
<style scoped>
.animated-number { font-variant-numeric: tabular-nums; }
.increased { color: #79cc95; text-shadow: 0 0 .6rem #79cc9544; }
.decreased { color: var(--primary); text-shadow: 0 0 .6rem var(--primary-soft); }
</style>

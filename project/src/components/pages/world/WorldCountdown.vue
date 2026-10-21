<script setup lang="ts">
import { computed } from 'vue';
import { useServerClock } from '@/hooks/useServerClock';
const props = defineProps<{ until: number; serverTime?: number }>();
const now = useServerClock(computed(() => props.serverTime));
const left = computed(() => Math.max(0, props.until - now.value));
const time = computed(() => `${Math.floor(left.value / 3600).toString().padStart(2, '0')}:${Math.floor(left.value % 3600 / 60).toString().padStart(2, '0')}:${(left.value % 60).toString().padStart(2, '0')}`);
</script>
<template lang="pug">
span.world-countdown(:title="new Date(until * 1000).toLocaleString('ru-RU')") {{ left ? time : 'Можно обновить' }}
</template>
<style scoped>
.world-countdown { font-variant-numeric: tabular-nums; white-space: nowrap; }
</style>

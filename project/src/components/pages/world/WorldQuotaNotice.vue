<script setup lang="ts">
import { computed } from 'vue';
import type { parseEconomyQuota } from '@/services/api/worldEconomyQuota';
import WorldCountdown from './WorldCountdown.vue';
const props = withDefaults(defineProps<{ quota: NonNullable<ReturnType<typeof parseEconomyQuota>>; requested?: number; serverTime?: number; label?: string }>(), { requested: 1 });
const exceeds = computed(() => props.requested > props.quota.remaining);
const labels: Record<string, string> = { crafting_hourly: 'Изготовление за час', extraction_daily: 'Добыча за день', sales_daily: 'Продажи за день' };
</script>
<template lang="pug">
.world-quota(:class="{ exhausted: quota.remaining === 0, exceeds }" role="status")
  strong {{ label ?? labels[quota.kind] }}: {{ quota.remaining }} / {{ quota.maximum }}
  span(v-if="exceeds") {{ quota.remaining === 0 ? 'Лимит исчерпан.' : `Нужно ${requested}, осталось ${quota.remaining}. Уменьшите количество.` }}
  small(v-if="quota.remaining < quota.maximum") Восстановление через #[world-countdown(:until="quota.restoresAt" :server-time="serverTime ?? quota.serverTime")]
</template>
<style scoped>
.world-quota { display: grid; gap: .35rem; padding: .75rem; border: 1px solid var(--border); border-radius: .6rem; background: var(--primary-soft); font-size: .85rem; }.world-quota small { color: var(--text-muted); }.exhausted, .exceeds { border-color: var(--error, #d03050); background: rgba(208,48,80,.08); }.exceeds > span { color: var(--error, #d03050); font-weight: 600; }
</style>

<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NProgress } from 'naive-ui';
import { projectedWorkSeconds, type WorkProgressSnapshot } from '@/entities/world/workProgress';
import { formatDuration } from '@/entities/world/duration';
const props = defineProps<{ snapshot: WorkProgressSnapshot; identity: string; syncing?: boolean }>();
const emit = defineEmits<{ check: [] }>();
const seconds = ref(0);
let receivedAt = performance.now(), lastCheck = 0;
watch(() => props.identity, () => { seconds.value = 0; }, { flush: 'sync' });
watch(() => props.snapshot, next => {
  receivedAt = performance.now();
  const initial = projectedWorkSeconds(next, 0);
  seconds.value = next.working && next.live_work.length ? Math.max(seconds.value, initial) : initial;
}, { immediate: true });
const percentage = computed(() => Math.min(100, 100 * seconds.value / Math.max(1, props.snapshot.required_seconds)));
const timer = setInterval(() => {
  if (!props.snapshot.working) return;
  seconds.value = Math.max(seconds.value, projectedWorkSeconds(props.snapshot, (performance.now() - receivedAt) / 1000));
  if (seconds.value >= props.snapshot.required_seconds && !props.syncing && performance.now() - lastCheck > 1000) {
    lastCheck = performance.now(); emit('check');
  }
}, 100);
onScopeDispose(() => clearInterval(timer));
</script>
<template lang="pug">
.work-progress
  .work-progress-heading
    span Прогресс работы
    span.work-progress-time {{ formatDuration(Math.floor(seconds)) }} / {{ formatDuration(snapshot.required_seconds) }}
    font-awesome-icon.work-progress-sync(icon="spinner" :spin="syncing" :class="{ active: syncing }" :title="syncing ? 'Сверяем прогресс' : 'Прогресс синхронизирован'")
  n-progress(type="line" :percentage="percentage" :show-indicator="false")
</template>
<style scoped>
.work-progress { display: grid; gap: .5rem; min-height: 2.75rem; align-content: start; }.work-progress-heading { display: flex; align-items: center; gap: .5rem; font-size: .8rem; }.work-progress-time { margin-left: auto; white-space: nowrap; font-variant-numeric: tabular-nums; }.work-progress-sync { flex: 0 0 .85rem; opacity: .3; }.work-progress-sync.active { opacity: 1; color: var(--primary); }
</style>

<script setup lang="ts">
import { onMounted, onScopeDispose, ref, watch } from 'vue';
const props = defineProps<{duration: number; type: string}>();
const remaining = ref(100);
let frame = 0;
function start() {
  cancelAnimationFrame(frame);
  remaining.value = 100;
  if (props.duration <= 0) return;
  const started = performance.now();
  const tick = () => {
    remaining.value = Math.max(0, 100 * (1 - (performance.now() - started) / props.duration));
    if (remaining.value > 0) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}
onMounted(start);
watch(() => props.duration, start);
onScopeDispose(() => { if (frame) cancelAnimationFrame(frame); });
</script>
<template lang="pug">
.toast-content(:class="'toast-' + type")
  slot
  .toast-track(v-if="duration > 0" aria-hidden="true")
    .toast-progress(:style="{width: remaining + '%'}")
</template>
<style scoped>
.toast-content { --toast-color: #f59e0b; min-width: 180px; max-width: min(360px, 65vw); }
.toast-success { --toast-color: #4ade80; }.toast-error { --toast-color: #f87171; }.toast-warning { --toast-color: #fbbf24; }
.toast-track { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: #ffffff18; overflow: hidden; }
.toast-progress { height: 3px; background: var(--toast-color); }
</style>

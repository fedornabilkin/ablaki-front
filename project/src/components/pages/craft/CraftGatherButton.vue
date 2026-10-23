<script setup lang="ts">
defineProps<{ available: boolean; disabled?: boolean; countdown: string; remaining?: number; limit?: number; exhausted?: boolean }>();
defineEmits<{ gather: [] }>();
</script>
<template lang="pug">
button.gather-button(v-if="!exhausted" type="button" :class="{ 'gather-ready': available }" :disabled="disabled || !available" :aria-label="available ? 'Собрать сырьё' : `Сырьё собрано. Следующий сбор через ${countdown}`" @click="$emit('gather')")
  span.gather-symbol(v-if="available" aria-hidden="true")
    font-awesome-icon(icon="hand-holding")
    font-awesome-icon.gather-resources(icon="cubes")
  font-awesome-icon(v-else icon="check" aria-hidden="true")
  strong(v-if="available") Собрать
  span(v-else) {{ countdown }}
</template>
<style scoped>
.gather-symbol { position: relative; display: inline-flex; align-items: end; width: 1.2rem; height: 1.25rem; }.gather-symbol > svg:first-child { width: 1.2rem; }.gather-symbol > .gather-resources { position: absolute; width: .7rem; height: .7rem; right: -.05rem; top: -.05rem; }
.gather-button { position: relative; overflow: hidden; border: 1px solid #779b66; border-radius: .45rem; background: #233326; color: #e0f0d9; display: inline-flex; align-items: center; gap: .4rem; padding: .45rem .65rem; cursor: pointer; min-height: 2rem; white-space: nowrap; font-size: .85rem; font-variant-numeric: tabular-nums; }.gather-button:disabled { opacity: .7; cursor: default; }
.gather-ready::after { content: ''; position: absolute; inset: 0; transform: translateX(-110%); background: linear-gradient(110deg, transparent 30%, #ffffff22 50%, transparent 70%); animation: gather-glint 5s infinite; pointer-events: none; }@keyframes gather-glint { 0%, 65% { transform: translateX(-110%); } 90%, 100% { transform: translateX(110%); } }@media(prefers-reduced-motion: reduce) { .gather-ready::after { animation: none; } }
</style>

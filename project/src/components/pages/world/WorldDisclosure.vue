<script setup lang="ts">
withDefaults(defineProps<{ label: string; icon?: string; indicator?: string | number }>(), { icon: 'info-circle' });
</script>
<template lang="pug">
details.world-disclosure
  summary.world-disclosure__summary
    font-awesome-icon(:icon="icon" aria-hidden="true")
    span.world-disclosure__label {{ label }}
    span.world-disclosure__indicator(v-if="indicator") {{ indicator }}
    font-awesome-icon.world-disclosure__arrow(icon="arrow-down" aria-hidden="true")
  .world-disclosure__content
    slot
</template>
<style scoped>
.world-disclosure { min-width: 0; border-top: 1px solid var(--border); }
.world-disclosure__summary { display: flex; align-items: center; gap: .6rem; min-height: 2.75rem; padding: .5rem 0; color: var(--text-muted); cursor: pointer; list-style: none; font-size: .875rem; line-height: 1.4; }
.world-disclosure__summary::-webkit-details-marker { display: none; }
.world-disclosure__summary > svg { flex: 0 0 1em; }
.world-disclosure__label { flex: 1; min-width: 0; }
.world-disclosure__indicator { color: var(--text); font-variant-numeric: tabular-nums; }
.world-disclosure__arrow { font-size: .7rem; transition: transform var(--motion-fast, 160ms) ease; }
.world-disclosure[open] > summary { color: var(--text); }
.world-disclosure[open] .world-disclosure__arrow { transform: rotate(180deg); }
.world-disclosure__content { display: grid; gap: .75rem; min-width: 0; padding-block: .25rem .75rem; }
.world-disclosure__summary:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; border-radius: .25rem; }
@media(prefers-reduced-motion: reduce) { .world-disclosure__arrow { transition: none; } }
</style>

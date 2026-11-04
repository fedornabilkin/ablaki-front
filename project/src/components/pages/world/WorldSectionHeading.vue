<script setup lang="ts">
withDefaults(defineProps<{ title: string; icon: string; level?: 'h2' | 'h3' }>(), { level: 'h2' });
</script>
<template lang="pug">
.world-section-heading
  component.world-section-heading__title(:is="level")
    font-awesome-icon(:icon="icon" aria-hidden="true")
    span {{ title }}
  .world-section-heading__actions(v-if="$slots.default")
    slot
</template>
<style scoped>
.world-section-heading { display: flex; align-items: center; justify-content: space-between; gap: .75rem; min-width: 0; }
.world-section-heading__title { display: flex; align-items: center; gap: .6rem; min-width: 0; margin: 0; font-size: 1rem; line-height: 1.4; font-weight: 650; }
.world-section-heading__title > svg { flex: 0 0 1.1em; color: var(--text-muted); }
.world-section-heading__title > span { overflow-wrap: anywhere; }
.world-section-heading__actions { display: flex; align-items: center; flex-shrink: 0; gap: .5rem; }
@media(min-width: 760px) { .world-section-heading__title { font-size: 1.1rem; } }
</style>

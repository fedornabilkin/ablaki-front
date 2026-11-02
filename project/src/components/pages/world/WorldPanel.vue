<script setup lang="ts">
withDefaults(defineProps<{ as?: 'section' | 'aside' | 'div' }>(), { as: 'section' });
</script>
<template lang="pug">
component.world-panel-surface(:is="as")
  slot
</template>
<style scoped>
.world-panel-surface { min-width: 0; padding: 1rem; border: 1px solid var(--border); border-radius: .9rem; background: var(--bg-surface); }
@media(min-width: 760px) { .world-panel-surface { padding: 1.25rem; } }
</style>

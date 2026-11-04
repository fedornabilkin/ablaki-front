<script setup lang="ts">
withDefaults(defineProps<{ as?: 'section' | 'aside' | 'div'; inset?: boolean }>(), { as: 'section' });
</script>
<template lang="pug">
component.world-panel-surface(:is="as" :class="{ 'world-panel-surface--inset': inset }")
  slot
</template>
<style scoped>
.world-panel-surface { display: grid; align-content: start; gap: .75rem; min-width: 0; padding: .85rem; border: 1px solid var(--border); border-radius: .65rem; background: var(--bg-surface); }
.world-panel-surface--inset { padding: 0; border: 0; border-radius: 0; background: transparent; }
.world-panel-surface > :deep(.n-button) { justify-self: start; max-width: 100%; min-height: 2.75rem; }
.world-panel-surface > :deep(p) { margin: 0; font-size: .875rem; }
</style>

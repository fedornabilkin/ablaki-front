<script setup lang="ts">
withDefaults(defineProps<{ label: string; scroll?: boolean }>(), { scroll: true });
</script>
<template lang="pug">
.world-slot-grid(:class="{ 'world-slot-grid--scroll': scroll }" role="region" :aria-label="label" :tabindex="scroll ? 0 : undefined")
  slot
</template>
<style scoped>
.world-slot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 6.5rem), 1fr)); align-content: start; gap: .5rem; min-width: 0; padding: 3px; }
.world-slot-grid > :deep(*) { max-width: 8rem; }
.world-slot-grid--scroll { max-height: min(52svh, 30rem); overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
.world-slot-grid:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: .35rem; }
@media(max-width: 47.99rem) { .world-slot-grid > :deep(*) { max-width: none; } }
</style>

<script setup lang="ts">
defineProps<{ label: string }>();
</script>
<template lang="pug">
details.world-help-hint
  summary(:aria-label="label" :title="label") ?
  slot
</template>
<style scoped>
.world-help-hint { position: relative; justify-self: start; }
.world-help-hint summary { display: grid; place-items: center; width: 1.35rem; height: 1.35rem; border: 1px solid var(--border); border-radius: 50%; color: var(--text-muted); cursor: pointer; list-style: none; }
.world-help-hint summary::-webkit-details-marker { display: none; }
.world-help-hint :slotted(p) { max-width: 32rem; color: var(--text-muted); font-size: .9rem; }
</style>

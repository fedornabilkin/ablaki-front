<script setup lang="ts">
defineProps<{ items: { key: string; label: string; icon: string; value: string | number }[] }>();
</script>
<template lang="pug">
dl.app-facts
  template(v-for="fact in items" :key="fact.key")
    dt(:title="fact.label")
      font-awesome-icon(:icon="fact.icon" aria-hidden="true")
      span.fact-label {{ fact.label }}
    dd {{ fact.value }}
</template>
<style scoped>
.app-facts { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: baseline; gap: .6rem 1rem; margin: 0; }
dt { display: flex; align-items: center; gap: .5rem; color: var(--text-muted); }
dt svg { flex: 0 0 1rem; width: 1rem; text-align: center; }
dd { margin: 0; text-align: right; overflow-wrap: anywhere; }
@media (max-width: 600px) {
  .fact-label { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .app-facts { gap: .65rem .75rem; }
}
</style>

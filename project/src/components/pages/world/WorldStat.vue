<script setup lang="ts">
defineProps<{ label: string; icon: string }>();
</script>
<template lang="pug">
.world-stat(:aria-label="label")
  .world-stat-label
    font-awesome-icon(:icon="icon" aria-hidden="true")
    span {{ label }}
  strong.world-stat-value
    slot
</template>
<style scoped>
.world-stat { display: grid; gap: .4rem; min-width: 0; padding: .75rem; border: 1px solid var(--border); border-radius: .6rem; background: var(--bg-base); }
.world-stat-label { display: flex; align-items: center; gap: .4rem; color: var(--text-muted); font-size: .75rem; }.world-stat-label > svg { flex: none; color: var(--primary); }
.world-stat-value { font-size: 1rem; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
</style>

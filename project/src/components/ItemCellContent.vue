<script setup lang="ts">
defineProps<{ name?: string; icon?: string; quantity?: number; marker?: number }>();
</script>
<template lang="pug">
.item-cell-content
  .item-cell-top
    font-awesome-icon(:icon="icon || 'cube'" aria-hidden="true")
    strong(v-if="quantity !== undefined") ×{{ quantity }}
    small(v-else-if="marker !== undefined") {{ marker }}
  strong.item-cell-name {{ name }}
  slot
</template>
<style scoped>
.item-cell-content { display: flex; flex-direction: column; gap: .4rem; width: 100%; min-width: 0; }.item-cell-top { display: flex; align-items: center; justify-content: space-between; gap: .3rem; }.item-cell-top svg { color: var(--primary); font-size: 1.25rem; flex-shrink: 0; }.item-cell-top strong, .item-cell-top small { font-size: .7rem; }.item-cell-name { font-size: .8rem; line-height: 1.4; overflow-wrap: anywhere; text-align: left; }
</style>

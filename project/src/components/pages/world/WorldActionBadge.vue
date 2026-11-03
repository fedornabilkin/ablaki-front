<script setup lang="ts">
defineProps<{ count: number | null }>();
</script>
<template lang="pug">
span.world-action-badge
  slot
  span.world-action-badge__count(v-if="count !== null && count > 0" aria-hidden="true") {{ count }}
</template>
<style scoped>
.world-action-badge { position: relative; display: inline-flex; flex-shrink: 0; }
.world-action-badge__count { position: absolute; z-index: 1; right: -.3rem; top: -.3rem; display: grid; place-items: center; box-sizing: border-box; min-width: 1.25rem; height: 1.25rem; border-radius: 1rem; padding-inline: .2rem; background: var(--primary); color: var(--primary-contrast, #171717); border: 2px solid var(--bg-surface); font-size: .7rem; font-weight: 750; font-variant-numeric: tabular-nums; line-height: 1; pointer-events: none; }
.world-action-badge :deep(.n-button) { width: 2.75rem; height: 2.75rem; padding: 0; }
.world-action-badge :deep(.n-button__icon) { margin: 0; }
</style>

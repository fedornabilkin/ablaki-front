<script setup lang="ts">
defineProps<{ count: number; here?: boolean }>();
</script>
<template lang="pug">
span.world-presence(:title="`${here ? 'Вы здесь. ' : ''}Сейчас здесь: ${count}`" :aria-label="`${here ? 'Вы здесь. ' : ''}Сейчас здесь: ${count}`")
  span.location-dot(v-if="here" aria-hidden="true")
  span(v-if="here") Вы здесь
  font-awesome-icon(icon="users" aria-hidden="true")
  span {{ count }}
</template>
<style scoped>
.world-presence { display: inline-flex; align-items: center; gap: .35rem; color: var(--primary); white-space: nowrap; }
.location-dot { width: .5rem; height: .5rem; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 3px var(--primary-soft); }
</style>

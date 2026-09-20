<script setup lang="ts">
import { NButton } from 'naive-ui';
defineProps<{ icon: string; label: string }>();
</script>
<template lang="pug">
n-button.action-button(:aria-label="label" :title="label")
  template(#icon)
    font-awesome-icon(:icon="icon" aria-hidden="true")
  span.action-label {{ label }}
</template>
<style scoped>
@media (max-width: 47.99rem) { .action-label { display: none; } .action-button :deep(.n-button__icon) { margin: 0; } }
</style>

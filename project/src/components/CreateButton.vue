<script setup lang="ts">
import { NButton } from 'naive-ui';
withDefaults(defineProps<{ label?: string; disabled?: boolean }>(), { label: 'Создать' });
defineEmits<{ (event: 'click'): void }>();
</script>
<template lang="pug">
n-button.create-button(type="primary" :disabled="disabled" :aria-label="label" :title="label" @click="$emit('click')")
  template(#icon)
    font-awesome-icon(icon="plus" aria-hidden="true")
  span.create-label {{ label }}
</template>
<style scoped>
@media (max-width: 47.99rem) { .create-label { display: none; } .create-button :deep(.n-button__icon) { margin: 0; } }
</style>

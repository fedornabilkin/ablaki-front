<script setup lang="ts">
import { NButton } from 'naive-ui';
import { worldNeutralButtonTheme } from '@/entities/world/theme';
export interface Choice { value: string; label: string; icon?: string; disabled?: boolean }
defineProps<{ modelValue: string; options: readonly Choice[]; label: string; mobileIcons?: boolean; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>
<template lang="pug">
.choice-buttons(role="group" :aria-label="label" :class="{ 'mobile-icons': mobileIcons }")
  n-button(v-for="option in options" :key="option.value" :theme-overrides="worldNeutralButtonTheme" :type="modelValue === option.value ? 'primary' : 'default'" size="small" :disabled="disabled || option.disabled" :aria-pressed="modelValue === option.value" :aria-label="option.label" :title="option.label" @click="emit('update:modelValue', option.value)")
    font-awesome-icon(v-if="option.icon" :icon="option.icon" aria-hidden="true")
    span.choice-label(:class="{ 'with-icon': option.icon }") {{ option.label }}
</template>
<style scoped>
.choice-buttons { display: flex; flex-wrap: wrap; gap: .4rem; min-width: 0; }.with-icon { margin-left: .4rem; }
@media(max-width: 620px) { .choice-buttons .n-button { min-height: 2.5rem; }.mobile-icons { flex-wrap: nowrap; gap: .25rem; overflow-x: auto; }.mobile-icons .n-button { flex: 1 0 2rem; min-width: 2rem; padding-inline: .4rem; }.mobile-icons .with-icon { display: none; } }
</style>

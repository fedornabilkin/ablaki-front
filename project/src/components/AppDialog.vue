<script setup lang="ts">
import { NModal } from 'naive-ui';
import { worldModalTheme } from '@/entities/world/theme';
defineOptions({ inheritAttrs: false });
defineProps<{ show: boolean; title?: string; icon?: string }>();
const emit = defineEmits<{ 'update:show': [value: boolean] }>();
</script>
<template lang="pug">
n-modal.app-dialog(:theme-overrides="worldModalTheme" preset="card" :show="show" :aria-label="title" :style="{ width: 'min(42rem, calc(100vw - 1.5rem))' }" v-bind="$attrs" @update:show="emit('update:show', $event)")
  template(#header)
    .dialog-heading
      font-awesome-icon(v-if="icon" :icon="icon" aria-hidden="true")
      span {{ title }}
  slot
  template(v-if="$slots.footer" #footer)
    slot(name="footer")
</template>
<style scoped>
.dialog-heading { display: flex; align-items: center; gap: .6rem; min-width: 0; }.dialog-heading > svg { color: var(--primary); flex: 0 0 1em; }
</style>

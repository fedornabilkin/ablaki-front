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
.app-dialog { max-width: calc(100vw - 1.5rem); border-radius: .75rem; }
.dialog-heading { display: flex; align-items: center; gap: .6rem; min-width: 0; font-size: 1rem; line-height: 1.4; }.dialog-heading > svg { color: var(--primary); flex: 0 0 1em; }.dialog-heading > span { overflow-wrap: anywhere; }
.app-dialog :deep(.n-card__content) { min-width: 0; }
.app-dialog :deep(.n-card-header__close) { width: 2.75rem; height: 2.75rem; }
@media(max-width: 47.99rem) { .app-dialog :deep(.n-card-header), .app-dialog :deep(.n-card__content), .app-dialog :deep(.n-card__footer) { padding-inline: .85rem; } }
</style>

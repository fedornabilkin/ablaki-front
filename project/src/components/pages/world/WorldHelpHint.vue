<script setup lang="ts">
import { NPopover } from 'naive-ui';
defineOptions({ inheritAttrs: false });
withDefaults(defineProps<{ label: string; symbol?: string }>(), { symbol: '?' });
const emit = defineEmits<{ open: [] }>();
</script>
<template lang="pug">
n-popover(trigger="click" placement="bottom" :style="{ maxWidth: 'min(32rem, 90vw)' }" @update:show="value => { if (value) emit('open'); }")
  template(#trigger)
    button.world-help-hint(v-bind="$attrs" type="button" :aria-label="label")
      font-awesome-icon(icon="question-circle" aria-hidden="true")
  slot
</template>
<style scoped>
.world-help-hint { display: inline-grid; place-items: center; padding: .2rem; border: 0; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 1.2rem; }
.world-help-hint:focus-visible { outline: 2px solid var(--primary); border-radius: 50%; }
.world-help-hint :slotted(p) { max-width: 32rem; color: var(--text-muted); font-size: .9rem; }
</style>

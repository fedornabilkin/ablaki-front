<script setup lang="ts">
import { NPopover } from 'naive-ui';
import { ref } from 'vue';
import { usePopoverViewport } from '@/hooks/usePopoverViewport';
defineOptions({ inheritAttrs: false });
const content = ref<HTMLElement | null>(null);
usePopoverViewport(content);
</script>
<template lang="pug">
n-popover.app-popover(v-bind="$attrs" to="body" :show-arrow="false" :flip="true" :style="{ boxSizing: 'border-box', minWidth: 0, maxWidth: 'min(32rem, calc(100vw - 2rem))', maxHeight: 'min(36rem, calc(100dvh - 2rem))' }")
  .app-popover-content(ref="content")
    slot
  template(v-for="name in Object.keys($slots).filter(name => name !== 'default')" #[name]="slotProps")
    slot(:name="name" v-bind="slotProps || {}")
</template>
<style>
.app-popover.n-popover { border-radius: .75rem; outline: 1px solid var(--border); outline-offset: -1px; padding: .75rem; overflow: auto; overscroll-behavior: contain; overflow-wrap: anywhere; }
.app-popover .n-popover__content { min-width: 0; max-width: 100%; }
.app-popover-content > :first-child { margin-top: 0; }
.app-popover-content > :last-child { margin-bottom: 0; }
</style>

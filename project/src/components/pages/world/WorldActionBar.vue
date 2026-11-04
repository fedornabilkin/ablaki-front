<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import AppPopover from '@/components/AppPopover.vue';

export interface WorldAction {
  id: string;
  label: string;
  icon: string;
  to?: RouteLocationRaw;
  hint?: string;
  active?: boolean;
  disabled?: boolean;
}
defineProps<{ label: string; items: readonly WorldAction[] }>();
const emit = defineEmits<{ select: [id: string] }>();
</script>
<template lang="pug">
.world-action-bar(role="group" :aria-label="label")
  app-popover(v-for="item in items" :key="item.id" trigger="click" placement="bottom" :disabled="!item.hint")
    template(#trigger)
      router-link.world-toolbar-action(v-if="item.to" :to="item.to" active-class="" exact-active-class="" :class="{ active: item.active }" :aria-label="item.label" :title="item.label" :aria-current="item.active ? 'page' : undefined")
        font-awesome-icon(:icon="item.icon" aria-hidden="true")
        span.world-action-label {{ item.label }}
      button.world-toolbar-action(v-else type="button" :disabled="item.disabled" :class="{ active: item.active }" :aria-label="item.label" :title="item.label" :aria-pressed="item.active" @click="emit('select', item.id)")
        font-awesome-icon(:icon="item.icon" aria-hidden="true")
        span.world-action-label {{ item.label }}
    .world-action-hint
      strong {{ item.label }}
      p {{ item.hint }}
  slot
</template>
<style scoped>
.world-action-bar { display: flex; align-items: center; flex-wrap: wrap; gap: .3rem; min-width: 0; }
.world-toolbar-action { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; flex: 0 0 auto; min-width: 2.75rem; min-height: 2.75rem; padding: .55rem; border: 1px solid var(--border); border-radius: .5rem; background: var(--bg-surface); color: var(--text-muted); font: inherit; font-size: .8125rem; cursor: pointer; transition: background-color 160ms ease, border-color 160ms ease; }
.world-toolbar-action > svg { width: 1rem; flex: none; }
.world-toolbar-action:hover:not(:disabled), .world-toolbar-action.active { color: var(--primary); border-color: color-mix(in srgb, var(--primary) 60%, var(--border)); background: var(--primary-soft); }
.world-toolbar-action:disabled { cursor: default; opacity: .45; }
.world-toolbar-action:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.world-action-label { display: none; }
.world-action-hint { max-width: 17rem; font-size: .8125rem; }
.world-action-hint p { margin: .4rem 0 0; color: var(--text-muted); }
@media(max-width: 23rem) { .world-action-bar { gap: .2rem; } }
@media(min-width: 64rem) { .world-action-label { display: inline; }.world-toolbar-action { padding-inline: .75rem; } }
@media(prefers-reduced-motion: reduce) { .world-toolbar-action { transition: none; } }
</style>

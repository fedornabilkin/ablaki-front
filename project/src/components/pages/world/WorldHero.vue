<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
defineProps<{ title: string; icon: string; description?: string; parentTo?: RouteLocationRaw; parentLabel?: string }>();
</script>
<template lang="pug">
header.world-hero-surface
  .world-hero-surface__identity
    .world-hero-surface__icon(aria-hidden="true")
      font-awesome-icon(:icon="icon")
    .world-hero-surface__heading
      h1 {{ title }}
      .world-hero-surface__meta(v-if="parentTo || $slots.default")
        router-link.world-hero-surface__parent(v-if="parentTo" :to="parentTo")
          font-awesome-icon(icon="arrow-left" aria-hidden="true")
          span {{ parentLabel || 'Назад' }}
        slot
  p.world-hero-surface__description(v-if="description") {{ description }}
  .world-hero-surface__actions(v-if="$slots.actions")
    slot(name="actions")
</template>
<style scoped>
.world-hero-surface { display: grid; gap: .75rem; padding: 1rem; border: 1px solid var(--border); border-radius: .9rem; background: var(--bg-surface); }
.world-hero-surface__identity { display: flex; align-items: flex-start; gap: .75rem; min-width: 0; }
.world-hero-surface__icon { display: grid; place-items: center; flex: 0 0 2.75rem; height: 2.75rem; border-radius: .75rem; background: var(--bg-surface-2, #242424); color: var(--text-muted); font-size: 1.2rem; }
.world-hero-surface__heading { min-width: 0; }
h1 { margin: 0; font-size: clamp(1.25rem, 2.5vw, 1.8rem); line-height: 1.3; overflow-wrap: anywhere; }
.world-hero-surface__meta { display: flex; align-items: center; flex-wrap: wrap; gap: .35rem .65rem; margin-top: .15rem; color: var(--text-muted); font-size: .8125rem; }
.world-hero-surface__parent { display: inline-flex; align-items: center; gap: .4rem; min-height: 2.75rem; color: var(--text-muted); }
.world-hero-surface__parent:hover { color: var(--primary); }
.world-hero-surface__description { margin: 0; color: var(--text-muted); font-size: .875rem; line-height: 1.55; }
.world-hero-surface__actions { min-width: 0; padding-top: .75rem; border-top: 1px solid var(--border); }
@media(min-width: 1000px) {
  .world-hero-surface { grid-template-columns: minmax(0, 1fr) auto; align-items: center; padding: 1.25rem; }
  .world-hero-surface__description { grid-column: 1; }
  .world-hero-surface__actions { grid-column: 2; grid-row: 1 / 3; padding: 0; border: 0; }
}
</style>

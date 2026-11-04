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
.world-hero-surface { display: grid; gap: .65rem; padding: .875rem .75rem; margin-inline: -.75rem; border-block: 1px solid var(--border); background: linear-gradient(110deg, var(--bg-surface) 50%, var(--primary-soft)), var(--bg-surface); }
.world-hero-surface__identity { display: flex; align-items: center; gap: .75rem; min-width: 0; }
.world-hero-surface__icon { display: grid; place-items: center; flex: 0 0 2.75rem; height: 2.75rem; border-radius: .65rem; border: 1px solid color-mix(in srgb, var(--primary) 60%, var(--border)); background: var(--primary-soft); color: var(--primary); font-size: 1.4rem; }
.world-hero-surface__heading { min-width: 0; }
h1 { margin: 0; font-size: clamp(1.25rem, 2.2vw, 1.75rem); line-height: 1.25; overflow-wrap: anywhere; }
.world-hero-surface__meta { display: flex; align-items: center; flex-wrap: wrap; gap: .25rem .5rem; margin-top: .2rem; color: var(--text-muted); font-size: .75rem; }
.world-hero-surface__parent { display: inline-flex; align-items: center; gap: .35rem; min-height: 2rem; max-width: 100%; color: var(--primary); }
.world-hero-surface__parent > svg { flex: none; width: .8rem; }
.world-hero-surface__parent > span { min-width: 0; overflow-wrap: anywhere; }
.world-hero-surface__parent:hover { color: var(--primary-hover); }
.world-hero-surface__description { margin: 0; color: var(--text-muted); font-size: .875rem; line-height: 1.55; }
.world-hero-surface__actions { display: flex; align-items: center; flex-wrap: wrap; gap: .65rem; min-width: 0; }
@media(min-width: 48rem) {
  .world-hero-surface { margin-inline: 0; border: 1px solid var(--border); border-radius: .7rem; padding: 1rem; }
}
@media(min-width: 64rem) {
  .world-hero-surface { grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: .5rem 1.25rem; padding: 1rem 1.1rem; }
  .world-hero-surface__description { grid-column: 1; }
  .world-hero-surface__actions { grid-column: 2; grid-row: 1 / 3; justify-content: flex-end; }
}
</style>

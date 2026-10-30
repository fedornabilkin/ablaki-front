<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
export interface SectionLink { label: string; to: RouteLocationRaw; icon?: string; active?: boolean }
defineProps<{ label: string; items: readonly SectionLink[]; connected?: boolean }>();
</script>
<template lang="pug">
nav.section-nav(:aria-label="label" :class="{ connected }")
  router-link.section-link(v-for="(item, index) in items" :key="index" :to="item.to" active-class="" :exact-active-class="item.active === undefined ? 'active' : ''" :class="{ active: item.active }" :aria-current="item.active === true ? 'page' : undefined")
    font-awesome-icon(v-if="item.icon" :icon="item.icon" aria-hidden="true")
    span {{ item.label }}
</template>
<style scoped>
.section-nav { display: flex; flex-wrap: wrap; gap: .35rem; min-width: 0; }
.section-link { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; min-height: 2.75rem; padding: .55rem .75rem; border: 1px solid var(--border); border-radius: .55rem; color: var(--text-muted); font-weight: 600; }
.section-link > svg { flex: 0 0 1em; }
.section-link:hover, .section-link.active { color: var(--primary); background: var(--primary-soft); border-color: var(--primary); }
.connected { flex-wrap: nowrap; overflow-x: auto; padding: .35rem .75rem 0; border-bottom: 1px solid var(--border); }
.connected .section-link { flex-shrink: 0; border-bottom: 2px solid transparent; border-radius: .5rem .5rem 0 0; }
.connected .active { border-bottom-color: var(--primary); }
@media(max-width: 620px) { .section-link { font-size: .85rem; padding-inline: .55rem; }.connected { padding-inline: .4rem; } }
</style>

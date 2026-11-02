<script setup lang="ts">
import { nextTick, onMounted, onScopeDispose, ref, watch } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
export interface SectionLink { label: string; to: RouteLocationRaw; icon?: string; active?: boolean }
const props = defineProps<{ label: string; items: readonly SectionLink[]; connected?: boolean; compact?: boolean }>();
const navigation = ref<HTMLElement>();
function revealActive() {
  const container = navigation.value;
  const active = container?.querySelector?.<HTMLElement>('.active');
  if (!container || !active || (!props.compact && !props.connected)) return;
  const bounds = container.getBoundingClientRect(), selected = active.getBoundingClientRect();
  if (selected.left < bounds.left) container.scrollLeft -= bounds.left - selected.left;
  else if (selected.right > bounds.right) container.scrollLeft += selected.right - bounds.right;
}
let resize: ResizeObserver | undefined;
onMounted(() => {
  revealActive();
  if (navigation.value && typeof ResizeObserver !== 'undefined') {
    resize = new ResizeObserver(revealActive);
    resize.observe(navigation.value);
  }
});
onScopeDispose(() => resize?.disconnect());
watch(() => props.items.findIndex(item => item.active), () => { void nextTick(revealActive); });
</script>
<template lang="pug">
nav.section-nav(ref="navigation" :aria-label="label" :class="{ connected, compact }")
  router-link.section-link(v-for="(item, index) in items" :key="index" :to="item.to" active-class="" :exact-active-class="item.active === undefined ? 'active' : ''" :class="{ active: item.active }" :aria-current="item.active === true ? 'page' : undefined")
    font-awesome-icon(v-if="item.icon" :icon="item.icon" aria-hidden="true")
    span {{ item.label }}
</template>
<style scoped>
.section-nav { display: flex; flex-wrap: wrap; gap: .35rem; min-width: 0; }
.section-link { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; min-height: 2.75rem; padding: .55rem .75rem; border: 1px solid var(--border); border-radius: .55rem; color: var(--text-muted); font-weight: 600; }
.section-link > svg { flex: 0 0 1em; }
.section-link:hover, .section-link.active { color: var(--primary); background: var(--primary-soft); border-color: var(--primary); }
.compact { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: thin; }
.compact .section-link { flex: 0 0 auto; border-color: transparent; background: transparent; border-radius: .35rem; }
.compact .section-link.active { color: var(--text); background: var(--bg-surface-2, #242424); }
.connected { flex-wrap: nowrap; overflow-x: auto; padding: .35rem .75rem 0; border-bottom: 1px solid var(--border); }
.connected .section-link { flex-shrink: 0; border-color: transparent; background: transparent; border-bottom: 2px solid transparent; border-radius: .5rem .5rem 0 0; }
.connected .active { color: var(--text); border-bottom-color: var(--primary); }
@media(max-width: 620px) { .section-link { font-size: .85rem; padding-inline: .55rem; }.connected { padding-inline: .4rem; } }
</style>

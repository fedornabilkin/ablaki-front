<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import WorldPageActions from './WorldPageActions.vue';
withDefaults(defineProps<{ title: string; description?: string; icon?: string; parentTo?: string; parentLabel?: string; compact?: boolean }>(), { icon: 'hammer', parentLabel: 'Вернуться к объекту' });
const route = useRoute();
const contextNode = computed(() => {
  const id = Number(/^\/world\/workspace\/\d+$/.test(route.path) ? route.params.id : route.query.node ?? route.query.node_id);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
});
</script>
<template lang="pug">
header.world-workspace-hero(:class="{ compact }")
  .workspace-crest(aria-hidden="true")
    font-awesome-icon(:icon="icon")
  .workspace-heading
    span.workspace-eyebrow Мастерская мира
    h1 {{ title }}
    p(v-if="description") {{ description }}
    .workspace-hero-actions(v-if="parentTo || $slots.default")
      router-link.workspace-parent(v-if="parentTo" :to="parentTo") ← {{ parentLabel }}
      slot
  world-page-actions(v-if="route.path.startsWith('/world')" :node-id="contextNode")
</template>
<style scoped>
.world-workspace-hero { display: flex; gap: 1rem; align-items: start; padding: 1.25rem; border: 1px solid var(--border); border-radius: .8rem; background: radial-gradient(circle at 80% 12%, var(--primary-soft), transparent 45%), var(--bg-surface); }
.workspace-crest { display: grid; place-items: center; flex: 0 0 4.5rem; height: 4.5rem; border: 1px solid var(--primary); border-radius: .85rem; background: var(--primary-soft); color: var(--primary); font-size: 2rem; }
.workspace-heading { min-width: 0; flex: 1; }
.workspace-eyebrow { color: var(--primary); font-size: .72rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
h1 { margin: .25rem 0 .5rem; font-size: clamp(1.6rem, 3vw, 2.4rem); line-height: 1.2; overflow-wrap: anywhere; }
p { margin: 0; color: var(--text-muted); line-height: 1.5; }
.workspace-hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; margin-top: .85rem; }
.workspace-parent { display: inline-flex; padding: .4rem .75rem; border: 1px solid var(--border); border-radius: .45rem; font-size: .85rem; }
.workspace-parent:hover { border-color: var(--primary); background: var(--primary-soft); }
.compact { padding: .75rem; gap: .75rem; }.compact .workspace-crest { flex-basis: 2.75rem; height: 2.75rem; font-size: 1.3rem; }.compact h1 { font-size: 1.2rem; }.compact p { font-size: .8rem; }
@media(max-width: 900px) { .world-workspace-hero { flex-wrap: wrap; }.world-page-actions { width: 100%; } }
@media(max-width: 600px) { .world-workspace-hero { padding: 1rem; gap: .75rem; }.workspace-crest { flex-basis: 3rem; height: 3rem; font-size: 1.5rem; } }
@media(max-width: 620px) {
  .world-workspace-hero { display: grid; grid-template-columns: 2.5rem minmax(0, 1fr); padding: .75rem; gap: .6rem; }
  .workspace-crest { height: 2.5rem; font-size: 1.2rem; }
  .workspace-eyebrow { font-size: .65rem; }
  h1 { margin: .15rem 0 .25rem; font-size: 1.25rem; }
  p { font-size: .8rem; }
  .workspace-hero-actions { margin-top: .4rem; gap: .4rem; font-size: .8rem; }
  .workspace-parent { padding: .3rem .5rem; font-size: .8rem; }
  .world-page-actions { grid-column: 1 / -1; }
}
</style>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { NButton } from 'naive-ui';
import { craftRoadmap, craftRequirements } from '@/entities/craft/classic';
import type { CraftState } from '@/services/api/classicCraft';
const props = defineProps<{state: CraftState; selected: number | null; category: number | null}>();
const emit = defineEmits<{select: [id: number]}>();
const graph = computed(() => craftRoadmap(props.state.recipes));
const zoom = ref(1);
const viewport = ref<HTMLElement>();
const items = computed(() => new Map(props.state.items.map(i => [i.id, i])));
const statuses = computed(() => new Map(props.state.recipes.map(r => [r.id, r.locked_reasons.length ? 'locked' : craftRequirements(props.state, r, 1).reasons.length ? 'open' : 'ready'])));
function center() {
  const node = graph.value.nodes.find(n => n.recipe.id === props.selected);
  if (node && viewport.value) viewport.value.scrollTo({left: Math.max(0, node.x * zoom.value - viewport.value.clientWidth / 2 + 110), top: Math.max(0, node.y * zoom.value - 120), behavior: 'smooth'});
}
watch(() => props.selected, async () => { await nextTick(); center(); });
function keys(event: KeyboardEvent) {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  const buttons = Array.from(viewport.value?.querySelectorAll<HTMLButtonElement>('.recipe-node') ?? []);
  const index = buttons.indexOf(event.target as HTMLButtonElement);
  if (index < 0) return;
  event.preventDefault(); buttons[(index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length]?.focus();
}
</script>
<template lang="pug">
.roadmap
  .map-tools
    .map-legend
      span.ready-dot Можно создать
      span Открыт · нужны ресурсы
      span
        font-awesome-icon(icon="lock")
        |  Нужны исследования
    .zoom-tools
      n-button(size="small" aria-label="Уменьшить карту" :disabled="zoom <= .5" @click="zoom = Math.max(.5, zoom - .1)") −
      span {{ Math.round(zoom * 100) }}%
      n-button(size="small" aria-label="Увеличить карту" :disabled="zoom >= 1.5" @click="zoom = Math.min(1.5, zoom + .1)") +
      n-button(size="small" :disabled="!selected" @click="center") К выбранному
  .map-viewport(ref="viewport" tabindex="0" role="region" aria-label="Карта развития крафта. Прокрутка в обе стороны; рецепты выбираются клавишами Tab и Enter." @keydown="keys")
    .map-space(:style="{width: graph.width * zoom + 'px', height: graph.height * zoom + 'px'}")
      .map-canvas(:style="{width: graph.width + 'px', height: graph.height + 'px', transform: 'scale(' + zoom + ')'}")
        svg.connections(:width="graph.width" :height="graph.height" aria-hidden="true")
          path(v-for="edge in graph.edges" :key="edge.id" :d="edge.path" :class="{highlight: edge.to === selected || edge.from === selected}")
        span.map-heading Из сырья — к мастерству →
        button.recipe-node(v-for="node in graph.nodes" :key="node.recipe.id" type="button" :class="[statuses.get(node.recipe.id), {selected: selected === node.recipe.id, muted: category && node.recipe.category_id !== category}]" :style="{left: node.x + 'px', top: node.y + 'px'}" :aria-pressed="selected === node.recipe.id" @click="emit('select', node.recipe.id)")
          font-awesome-icon.node-icon(:icon="items.get(node.recipe.item_id)?.icon || 'cube'")
          .node-text
            strong {{ items.get(node.recipe.item_id)?.name }}
            small Уровень {{ node.recipe.min_level }} · {{ node.recipe.output_quantity }} шт.
            small(v-if="node.recipe.crafted") ✓ Создано партий: {{ node.recipe.crafted }}
            small(v-else-if="statuses.get(node.recipe.id) === 'ready'") Можно создать
            small(v-else-if="statuses.get(node.recipe.id) === 'locked'") Условия открытия
            small(v-else) Нужны ресурсы
</template>
<style scoped lang="scss">
.roadmap { min-width: 0; border: 1px solid var(--border); border-radius: .75rem; overflow: hidden; }
.map-tools, .zoom-tools, .map-legend { display: flex; align-items: center; flex-wrap: wrap; gap: .6rem; }
.map-tools { padding: .75rem; justify-content: space-between; background: var(--bg-surface); }
.map-legend { font-size: .75rem; color: var(--text-muted); gap: 1rem; }
.ready-dot { color: #7fdaa3; }
.map-viewport { overflow: auto; height: 580px; max-height: 70vh; background: radial-gradient(circle, #ffffff13 1px, transparent 1px), var(--bg-base); background-size: 24px 24px; overscroll-behavior: contain; }
.map-space, .map-canvas { position: relative; }
.map-canvas { transform-origin: top left; }
.connections { position: absolute; inset: 0; pointer-events: none; }
.connections path { stroke: #67615b; stroke-width: 2; fill: none; }
.connections path.highlight { stroke: var(--primary); stroke-width: 3; }
.map-heading { position: absolute; left: 24px; top: 14px; color: var(--text-muted); font-size: 12px; letter-spacing: .06em; }
.recipe-node { position: absolute; width: 220px; height: 88px; border: 1px solid #827566; border-radius: .65rem; color: var(--text); background: #29241e; display: flex; gap: .7rem; align-items: center; text-align: left; padding: .75rem; cursor: pointer; }
.recipe-node.ready { border-color: #69b686; background: #203329; }
.recipe-node.locked { background: var(--bg-surface); border-style: dashed; }
.recipe-node.selected { border: 2px solid var(--primary); box-shadow: 0 0 0 3px var(--primary-soft); }
.recipe-node:focus-visible { outline: 3px solid var(--primary); outline-offset: 3px; }
.recipe-node.muted { opacity: .45; }
.node-icon { width: 26px; height: 26px; color: #d6b685; flex-shrink: 0; }
.node-text { display: grid; gap: .2rem; min-width: 0; }
.node-text strong { font-size: 13px; line-height: 1.2; }
.node-text small { font-size: 11px; color: #c4bdb4; }
@media(max-width: 600px) { .map-viewport { height: 420px; } .map-legend { gap: .5rem; } }
</style>

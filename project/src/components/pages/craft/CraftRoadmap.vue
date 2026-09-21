<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import type { CraftState } from '@/services/api/classicCraft';
import { craftRoadmap, craftRequirements, craftEquipment, roadmapNodeSize } from '@/entities/craft/classic';
import { gestureCamera, zoomCamera, type MapPoint } from '@/entities/craft/camera';
const props = defineProps<{state: CraftState; selected: number | null; category: number | null; topInset: number; rightInset: number; leftInset?: number}>();
const emit = defineEmits<{select: [id: number]}>();
const graph = computed(() => craftRoadmap(props.state.recipes));
const camera = ref({x: 24, y: 24, scale: 1});
const viewport = ref<HTMLElement>();
const dragging = ref(false);
const points = new Map<number, MapPoint>();
let travel = 0, suppressClick = false;
const items = computed(() => new Map(props.state.items.map(i => [i.id, i])));
const statuses = computed(() => new Map(props.state.recipes.map(r => [r.id, r.locked_reasons.length ? 'locked' : craftRequirements(props.state, r, 1).reasons.length ? 'open' : 'ready'])));
const equipment = computed(() => new Map(props.state.recipes.map(recipe => [recipe.id, craftEquipment(props.state, recipe)])));
function point(event: MouseEvent): MapPoint {
  const rect = viewport.value!.getBoundingClientRect();
  return {x: event.clientX - rect.left, y: event.clientY - rect.top};
}
function down(event: PointerEvent) {
  if (event.button !== 0 || !viewport.value) return;
  if (!points.size) { travel = 0; suppressClick = false; }
  points.set(event.pointerId, point(event));
  // Capture on the original node so a click without dragging still selects it.
  (event.target as Element).setPointerCapture(event.pointerId);
}
function move(event: PointerEvent) {
  const previous = points.get(event.pointerId);
  if (!previous) return;
  const before = [...points.values()], next = point(event);
  points.set(event.pointerId, next);
  travel += Math.hypot(next.x - previous.x, next.y - previous.y);
  if (travel > 5 || points.size > 1) { dragging.value = true; suppressClick = true; }
  camera.value = gestureCamera(camera.value, before, [...points.values()]);
}
function up(event: PointerEvent) { points.delete(event.pointerId); if (!points.size) dragging.value = false; }
function click(event: MouseEvent) { if (suppressClick && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); } }
function wheel(event: WheelEvent) {
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.value!.clientHeight : 1);
  camera.value = zoomCamera(camera.value, point(event), Math.exp(-Math.max(-300, Math.min(300, delta)) * .002));
}
function reveal(id: number | null) {
  const node = graph.value.nodes.find(n => n.recipe.id === id), view = viewport.value;
  if (!node || !view) return;
  const left = props.leftInset ?? 12;
  const width = Math.max(100, view.clientWidth - props.rightInset - left);
  const height = Math.max(140, view.clientHeight - props.topInset - 24);
  camera.value = {...camera.value, x: left + width / 2 - (node.x + roadmapNodeSize.width / 2) * camera.value.scale, y: props.topInset + height / 2 - (node.y + roadmapNodeSize.height / 2) * camera.value.scale};
}
function focus(event: FocusEvent, id: number) {
  // Pointer focus must not move a node away while the user starts dragging it.
  if ((event.target as HTMLElement).matches(':focus-visible')) reveal(id);
}
function keys(event: KeyboardEvent) {
  if (['+', '=', '-', '_'].includes(event.key)) {
    event.preventDefault();
    camera.value = zoomCamera(camera.value, {x: viewport.value!.clientWidth / 2, y: viewport.value!.clientHeight / 2}, ['+', '='].includes(event.key) ? 1.15 : 1 / 1.15);
  } else if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
    camera.value = {...camera.value, x: camera.value.x + (event.key === 'ArrowLeft' ? 60 : event.key === 'ArrowRight' ? -60 : 0), y: camera.value.y + (event.key === 'ArrowUp' ? 60 : event.key === 'ArrowDown' ? -60 : 0)};
  }
}
watch(() => props.selected, () => reveal(props.selected));
onMounted(async () => { await nextTick(); reveal(props.selected); });
defineExpose({reveal});
</script>
<template lang="pug">
.map-viewport(ref="viewport" tabindex="0" role="region" :class="{dragging}" aria-label="Карта рецептов. Перетаскивайте мышью, масштабируйте колесом. С клавиатуры: стрелки, плюс и минус; Tab и Enter для выбора рецепта." @keydown="keys" @wheel.prevent="wheel" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @lostpointercapture="up" @click.capture="click")
  .map-canvas(:style="{width: graph.width + 'px', height: graph.height + 'px', transform: 'translate(' + camera.x + 'px, ' + camera.y + 'px) scale(' + camera.scale + ')'}")
    svg.connections(:width="graph.width" :height="graph.height" aria-hidden="true")
      path(v-for="edge in graph.edges" :key="edge.id" :d="edge.path" :class="{highlight: edge.to === selected || edge.from === selected}")
    button.recipe-node(v-for="node in graph.nodes" :key="node.recipe.id" type="button" :class="[statuses.get(node.recipe.id), {selected: selected === node.recipe.id, muted: category && node.recipe.category_id !== category}]" :style="{left: node.x + 'px', top: node.y + 'px', width: roadmapNodeSize.width + 'px', height: roadmapNodeSize.height + 'px'}" :aria-pressed="selected === node.recipe.id" @click="emit('select', node.recipe.id)" @focus="focus($event, node.recipe.id)")
      font-awesome-icon.node-icon(:icon="items.get(node.recipe.item_id)?.icon || 'cube'")
      .node-text
        strong {{ items.get(node.recipe.item_id)?.name }}
        small Уровень {{ node.recipe.min_level }} · {{ node.recipe.output_quantity }} шт.
        small(v-if="node.recipe.crafted") ✓ Создано партий: {{ node.recipe.crafted }}
        small(v-else-if="statuses.get(node.recipe.id) === 'ready'") Можно создать
        small(v-else-if="statuses.get(node.recipe.id) === 'locked'") Условия открытия
        small(v-else) Нужны ресурсы
      .node-equipment(v-if="equipment.get(node.recipe.id)?.length")
        span.equipment-badge(v-for="badge in equipment.get(node.recipe.id)" :key="badge.key" :class="{missing: !badge.available}" :title="badge.label" :aria-label="badge.label")
          font-awesome-icon(:icon="badge.icon")
</template>
<style scoped lang="scss">
.map-viewport { position: absolute; inset: 0; overflow: hidden; touch-action: none; user-select: none; cursor: grab; background: radial-gradient(circle, #ffffff18 1px, transparent 1px), var(--bg-base); background-size: 24px 24px; overscroll-behavior: none; }
.map-viewport.dragging, .dragging .recipe-node { cursor: grabbing; }
.map-canvas { position: absolute; transform-origin: top left; }
.connections { position: absolute; inset: 0; pointer-events: none; }
.connections path { stroke: #67615b; stroke-width: 2; fill: none; }
.connections path.highlight { stroke: var(--primary); stroke-width: 3; }
.recipe-node { position: absolute; box-sizing: border-box; border: 1px solid #827566; border-radius: .65rem; color: var(--text); background: #29241e; display: flex; gap: .6rem; align-items: center; text-align: left; padding: .75rem; cursor: pointer; }
.recipe-node.ready { border-color: #69b686; background: #203329; }
.recipe-node.locked { background: var(--bg-surface); border-style: dashed; }
.recipe-node.selected { border: 2px solid var(--primary); box-shadow: 0 0 0 3px var(--primary-soft); }
.recipe-node:focus-visible { outline: 3px solid var(--primary); outline-offset: 3px; }
.recipe-node.muted { opacity: .4; }
.node-icon { width: 26px; height: 26px; color: #d6b685; flex-shrink: 0; }
.node-text { display: grid; gap: .2rem; min-width: 0; flex: 1; }
.node-text strong { font-size: 13px; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.node-text small { font-size: 11px; color: #c4bdb4; }
.node-equipment { display: flex; flex-wrap: wrap; align-content: center; justify-content: flex-end; gap: 3px; width: 52px; max-height: 80px; overflow-y: auto; flex-shrink: 0; }
.equipment-badge { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 4px; border: 1px solid #69b686; color: #97d9af; background: #203329; }
.equipment-badge.missing { color: #ff9595; border-color: #e56d6d; background: #572b2b; }
</style>

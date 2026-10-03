<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton, NCheckbox } from 'naive-ui';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import type { WorldMapData, WorldNode } from '@/entities/world/types';
import type { MapPoint } from '@/entities/world/coordinates';
import { nodeLabels } from '@/entities/world/types';
import { formatCredits } from '@/entities/world/credits';
import { mapPurchase, requiredExplorerLevel, selectMapCells } from '@/entities/world/mapSelection';
import { loadExplorer, previewProfession, previewMapCells, worldError } from '@/services/api/world';

const props = defineProps<{ node: WorldNode; map: WorldMapData | null; writable: boolean; command: WorldCommandRunner; selection?: MapPoint[] }>();
const emit = defineEmits<{ 'update:selection': [MapPoint[]] }>();
const selectedNodeId = ref<number | null>(null), selected = ref<MapPoint[]>(props.selection ?? []), anchor = ref<MapPoint | null>(null);
const topUp = ref(true), multiSelect = ref(false), calculating = ref(false), error = ref('');
const explorer = ref<Awaited<ReturnType<typeof loadExplorer>>>(null);
let generation = 0;
watch(selected, value => emit('update:selection', value), { flush: 'sync' });
watch(() => props.map?.exploration?.allowed, async allowed => { if (!allowed) { explorer.value = null; return; } const id = props.node.id; try { const result = await loadExplorer(); if (props.node.id === id) explorer.value = result; } catch { /* Exploration itself still has its authoritative map requirements. */ } }, { immediate: true });
const size = 72, key = (p: MapPoint) => `${p.x}:${p.y}`;
const bounds = computed(() => props.map?.bounds ?? props.node.map ?? { x: -2, y: -2, width: 5, height: 5 });
const width = computed(() => bounds.value.width * size), height = computed(() => bounds.value.height * size);
const nodes = computed(() => props.map?.items ?? []);
const selectedNode = computed(() => nodes.value.find(n => n.id === selectedNodeId.value));
const known = computed(() => new Map((props.map?.cells ?? []).map(c => [key(c), c.state])));
const state = (p: MapPoint) => known.value.get(key(p)) ?? 'closed';
const point = computed(() => selected.value.length === 1 ? selected.value[0] : null);
const selectedState = computed(() => point.value ? state(point.value) : null);
const discovered = computed(() => (props.map?.cells ?? []).filter(c => c.state === 'discovered'));
const allDiscovered = computed(() => selected.value.length > 0 && selected.value.every(p => state(p) === 'discovered'));
const price = computed(() => allDiscovered.value && props.map?.pricing ? mapPurchase(props.map.pricing, selected.value.length) : null);
const required = computed(() => point.value ? requiredExplorerLevel(point.value) : 1);
const levelAllowed = computed(() => !!props.map?.exploration?.allowed && (props.map.exploration.level >= required.value));
const elixirAllowed = computed(() => !!props.map?.exploration?.allowed && props.map.exploration.elixir_quantity > 0);
const blocked = computed(() => calculating.value || props.command.busy.value || !!props.command.pending.value || !props.writable);
const position = (p: MapPoint) => ({ x: (p.x - bounds.value.x) * size, y: (bounds.value.y + bounds.value.height - 1 - p.y) * size });
const polygon = (node: WorldNode) => (node.footprint ?? []).map(p => `${(p.x - bounds.value.x) * size},${(bounds.value.y + bounds.value.height - p.y) * size}`).join(' ');
const cellPrice = (cell: MapPoint) => {
  const index = [...selected.value].sort((a, b) => a.y - b.y || a.x - b.x).findIndex(p => key(p) === key(cell));
  if (!props.map?.pricing) return '';
  return formatCredits(allDiscovered.value && index >= 0 && price.value ? price.value.unitPrices[index] : props.map.pricing.next_price);
};
function choose(p: MapPoint, event?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) {
  if (blocked.value) return;
  selectedNodeId.value = null; error.value = '';
  const mode = state(p) !== 'discovered' ? 'single' : event?.shiftKey ? 'range' : event?.ctrlKey || event?.metaKey || multiSelect.value ? 'toggle' : 'single';
  selected.value = selectMapCells(mode === 'single' ? [] : selected.value.filter(c => state(c) === 'discovered'), p, anchor.value, mode, discovered.value);
  if (mode !== 'range') anchor.value = p;
}
function clickMap(event: MouseEvent) {
  const svg = event.currentTarget as SVGSVGElement, matrix = svg.getScreenCTM();
  if (!matrix) return;
  const cursor = svg.createSVGPoint(); cursor.x = event.clientX; cursor.y = event.clientY;
  const local = cursor.matrixTransform(matrix.inverse());
  if (local.x < 0 || local.y < 0 || local.x >= width.value || local.y >= height.value) return;
  choose({ x: bounds.value.x + Math.floor(local.x / size), y: bounds.value.y + bounds.value.height - 1 - Math.floor(local.y / size) }, event);
}
function moveSelection(event: KeyboardEvent) {
  const delta: Record<string, MapPoint> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: 1 }, ArrowDown: { x: 0, y: -1 } };
  if (!delta[event.key]) return;
  event.preventDefault(); const current = point.value ?? { x: Math.max(bounds.value.x, Math.min(0, bounds.value.x + bounds.value.width - 1)), y: Math.max(bounds.value.y, Math.min(0, bounds.value.y + bounds.value.height - 1)) };
  const next = { x: Math.max(bounds.value.x, Math.min(bounds.value.x + bounds.value.width - 1, current.x + delta[event.key].x)), y: Math.max(bounds.value.y, Math.min(bounds.value.y + bounds.value.height - 1, current.y + delta[event.key].y)) };
  const child = nodes.value.find(n => n.coordinates.x === next.x && n.coordinates.y === next.y);
  if (child) selectNode(child); else choose(next, event);
}
function selectNode(node: WorldNode) { selectedNodeId.value = node.id; selected.value = []; error.value = ''; }
async function act(action: 'explore' | 'buy', elixir = false) {
  if (blocked.value || !selected.value.length || !props.map?.can_expand) return;
  if (action === 'explore' && (!point.value || !(elixir ? elixirAllowed.value : levelAllowed.value))) return;
  if (action === 'buy' && !price.value) return;
  const expectedPrice = action === 'buy' ? price.value!.total : '0.0000';
  const input = { cells: selected.value.map(p => ({ x: p.x, y: p.y })), top_up: topUp.value, use_elixir: elixir };
  const current = ++generation, id = props.node.id; calculating.value = true; error.value = '';
  try {
    const quote = await previewMapCells(id, action, input);
    if (current !== generation) return;
    if (quote.terms.price !== expectedPrice) { error.value = 'Цена изменилась. Обновите карту перед покупкой.'; return; }
    await props.command.submit(`/nodes/${id}/map-${action}`, input, quote);
  } catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) calculating.value = false; }
}
async function progress() {
  if (!explorer.value || blocked.value) return;
  const action = explorer.value.enrolled ? 'level-up' : 'enroll', id = explorer.value.id;
  const current = ++generation; calculating.value = true; error.value = '';
  try { const quote = await previewProfession(id, action); if (current === generation) await props.command.submit(`/professions/${id}/${action}`, {}, quote); }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) calculating.value = false; }
}
watch(() => props.node.id, () => { generation++; calculating.value = false; selectedNodeId.value = null; selected.value = []; anchor.value = null; error.value = ''; }, { flush: 'sync' });
onScopeDispose(() => { generation++; });
</script>

<template lang="pug">
.world-map-layout
  .world-map-main
    .world-map-window
      svg.world-map-board(:viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="xMidYMid meet" role="group" tabindex="0" :aria-label="`Карта ${node.label}. Стрелки — выбор ячейки, Shift или Ctrl — несколько ячеек.`" @click="clickMap" @keydown="moveSelection")
        defs
          pattern(:id="`world-grid-${node.id}`" :width="size" :height="size" patternUnits="userSpaceOnUse")
            rect(:width="size" :height="size" class="map-closed")
            path(:d="`M ${size} 0 L 0 0 0 ${size}`" class="map-grid")
        rect(:width="width" :height="height" :fill="`url(#world-grid-${node.id})`")
        g(v-for="cell in map?.cells ?? []" :key="key(cell)" :transform="`translate(${position(cell).x},${position(cell).y})`" class="map-cell")
          rect(:width="size" :height="size" :class="`map-${cell.state}`")
          text(v-if="cell.state === 'discovered'" :x="size - 5" y="15" text-anchor="end" class="map-price") {{ cellPrice(cell) }} Cr
          title Ячейка {{ cell.x }}, {{ cell.y }}: {{ cell.state === 'open' ? 'открыта' : 'исследована' }}
        rect(v-for="cell in selected" :key="`selected-${key(cell)}`" :x="position(cell).x + 2" :y="position(cell).y + 2" :width="size - 4" :height="size - 4" class="map-selected")
        polygon(v-for="child in nodes.filter(n => n.footprint)" :key="`shape-${child.id}`" :points="polygon(child)" class="map-footprint" @click.stop="selectNode(child)")
        g(v-for="child in nodes" :key="child.id" :transform="`translate(${position(child.coordinates).x},${position(child.coordinates).y})`" class="map-object" :class="{ owned: child.owned_by_me, active: selectedNodeId === child.id }" role="button" tabindex="0" :aria-label="`${nodeLabels[child.type]}: ${child.label}`" @click.stop="selectNode(child)" @keydown.enter.stop="selectNode(child)" @keydown.space.prevent.stop="selectNode(child)")
          rect(x="3" y="3" :width="size - 6" :height="size - 6" rx="6")
          text(:x="size / 2" y="33" text-anchor="middle" class="map-object-symbol") {{ child.type === 'ROOM' ? '▦' : child.type === 'BED' ? '♧' : child.type === 'BUILDING' ? '⌂' : '◆' }}
          text(:x="size / 2" y="54" text-anchor="middle" class="map-object-label") {{ child.label.length > 10 ? child.label.slice(0, 9) + '…' : child.label }}
          title {{ child.label }} · {{ child.coordinates.x }}, {{ child.coordinates.y }}
    p.world-map-hint {{ bounds.width }} × {{ bounds.height }} · X {{ bounds.x }}…{{ bounds.x + bounds.width - 1 }} · Y {{ bounds.y }}…{{ bounds.y + bounds.height - 1 }}. Shift — область, Ctrl / ⌘ — отдельные ячейки. До 100 за покупку.
    n-checkbox(v-if="map?.can_expand" v-model:checked="multiSelect") Выбирать несколько ячеек
  aside.world-map-inspector(aria-live="polite")
    template(v-if="selectedNode")
      span.world-map-kicker {{ nodeLabels[selectedNode.type] }}
      h3 {{ selectedNode.label }}
      dl
        dt Координаты
        dd {{ selectedNode.coordinates.x }}, {{ selectedNode.coordinates.y }}
        dt Дочерние объекты
        dd {{ selectedNode.descendant_count }}
        dt Жители с дочерними
        dd {{ selectedNode.population_total }}
        template(v-if="selectedNode.details.condition !== undefined")
          dt Прочность
          dd {{ selectedNode.details.condition }} / {{ selectedNode.details.max_condition ?? '—' }}
      router-link.world-map-open(:to="`/world/nodes/${selectedNode.id}`") Перейти к объекту →
    template(v-else-if="selected.length")
      span.world-map-kicker {{ point ? `Ячейка ${point.x}, ${point.y}` : `Выбрано ячеек: ${selected.length}` }}
      h3 {{ selectedState === 'open' ? 'Открыта' : allDiscovered ? 'Исследована' : 'Закрыта' }}
      p(v-if="selectedState === 'open'") Здесь можно разместить объект подходящего типа.
      p(v-else-if="!map?.can_expand") {{ map?.exploration?.reason || 'Ячейки открываются через развитие объекта.' }}
      template(v-else-if="selectedState === 'closed'")
        p Нужен исследователь {{ required }}-го уровня. Ваш уровень: {{ map?.exploration?.level ?? 0 }}.
        template(v-if="explorer && !levelAllowed")
          p(v-if="explorer.enrolled && explorer.next") Опыт: {{ explorer.xp }} / {{ explorer.next.required_xp }}. За исследование — 10 XP.
          n-button(v-if="!explorer.enrolled || explorer.next" :disabled="blocked || (explorer.enrolled && !explorer.next?.available)" @click="progress") {{ explorer.enrolled ? `Повысить уровень до ${explorer.next?.level}` : 'Стать исследователем · бесплатно' }}
        n-button(type="primary" :loading="calculating" :disabled="blocked || !levelAllowed" @click="act('explore')") Исследовать
        n-button(v-if="!levelAllowed" :loading="calculating" :disabled="blocked || !elixirAllowed" @click="act('explore', true)") Применить эликсир · 1 шт.
        p(v-if="!levelAllowed") В рюкзаке эликсиров: {{ map?.exploration?.elixir_quantity ?? 0 }}
      template(v-else-if="allDiscovered && price")
        p.map-total {{ formatCredits(price.total) }} Cr
        p(v-if="price.discount !== '0.0000'") Скидка 5%: {{ formatCredits(price.discount) }} Cr
        p(v-else) От трёх ячеек — скидка 5%.
        n-checkbox(v-model:checked="topUp" :disabled="blocked") Недостающую сумму взять с личного баланса
        n-button(type="primary" :loading="calculating" :disabled="blocked" @click="act('buy')") Купить {{ selected.length }} · {{ formatCredits(price.total) }} Cr
    p(v-else) Выберите объект или свободную ячейку на карте.
    n-alert(v-if="error" type="error" role="alert") {{ error }}
</template>

<style scoped>
.world-map-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(15rem, 21rem); gap: 1rem; align-items: start; }
.world-map-main { min-width: 0; }
.world-map-window { height: clamp(15rem, 54vh, 34rem); padding: .4rem; border: 1px solid var(--border); border-radius: .65rem; background: var(--bg-base); overflow: hidden; }
.world-map-board { display: block; width: 100%; height: 100%; cursor: pointer; }
.map-closed { fill: var(--bg-base); }
.map-grid { fill: none; stroke: var(--border); stroke-width: 1; }
.map-cell { pointer-events: none; }
.map-open { fill: var(--primary-soft); stroke: var(--border); }
.map-discovered { fill: var(--bg-surface); stroke: var(--border); }
.map-price { fill: var(--primary); font-size: 12px; font-weight: 700; }
.map-selected { fill: var(--primary-soft); fill-opacity: .35; stroke: var(--primary); stroke-width: 3; pointer-events: none; }
.map-footprint { fill: var(--primary-soft); stroke: var(--primary); }
.map-object rect { fill: var(--bg-surface); stroke: var(--primary); }
.map-object.owned rect { fill: var(--primary-soft); }
.map-object.active rect, .map-object:focus rect { stroke-width: 4; }
.map-object text { fill: var(--primary); pointer-events: none; }
.map-object-symbol { font-size: 27px; }
.map-object-label { font-size: 11px; }
.world-map-hint { margin: .55rem 0; color: var(--text-muted); font-size: .8rem; }
.world-map-inspector { display: grid; gap: .75rem; min-height: 13rem; padding: 1rem; border: 1px solid var(--border); border-radius: .65rem; background: var(--bg-surface); }
.world-map-inspector h3, .world-map-inspector p { margin: 0; }
.world-map-kicker { color: var(--primary); font-size: .8rem; font-weight: 700; }
.world-map-inspector dl { display: grid; grid-template-columns: 1fr auto; gap: .45rem .8rem; margin: 0; }
.world-map-inspector dt { color: var(--text-muted); }
.world-map-inspector dd { margin: 0; text-align: right; }
.world-map-open { display: block; padding: .65rem; border-radius: .4rem; background: var(--primary); color: white; text-align: center; }
.map-total { font-size: 1.5rem; font-weight: 700; }
@media (max-width: 760px) { .world-map-layout { grid-template-columns: 1fr; } }
</style>

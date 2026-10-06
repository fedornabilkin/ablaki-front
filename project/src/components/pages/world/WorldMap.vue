<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton, NCheckbox } from 'naive-ui';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import type { WorldMapData, WorldNode } from '@/entities/world/types';
import { occupiesCell } from '@/entities/world/coordinates';
import type { MapPoint } from '@/entities/world/coordinates';
import { nodeLabels } from '@/entities/world/types';
import { formatCredits } from '@/entities/world/credits';
import { mapAreaCells, mapPurchase, requiredExplorerLevel, selectMapCells } from '@/entities/world/mapSelection';
import { loadExplorer, previewProfession, previewMapCells, worldError } from '@/services/api/world';
import WorldCultivationPanel from './WorldCultivationPanel.vue';

const props = defineProps<{ node: WorldNode; map: WorldMapData | null; writable: boolean; command: WorldCommandRunner; selection?: MapPoint[]; session?: number }>();
const emit = defineEmits<{ 'update:selection': [MapPoint[]] }>();
const selected = ref<MapPoint[]>(props.selection ?? []), anchor = ref<MapPoint | null>(null);
const topUp = ref(true), calculating = ref(false), error = ref(''), droppedCrop = ref<{ id: number; sequence: number } | null>(null);
const explorer = ref<Awaited<ReturnType<typeof loadExplorer>>>(null);
let generation = 0, dropSequence = 0;
watch(selected, value => emit('update:selection', value), { flush: 'sync' });
watch(() => props.map?.exploration?.allowed, async allowed => { if (!allowed) { explorer.value = null; return; } const id = props.node.id; try { const result = await loadExplorer(); if (props.node.id === id) explorer.value = result; } catch { /* Exploration itself still has its authoritative map requirements. */ } }, { immediate: true });
const size = 88, key = (p: MapPoint) => `${p.x}:${p.y}`;
const icons = { WORLD: 'sun', REGION: 'mountain', SETTLEMENT: 'city', BUILDING: 'house', ROOM: 'house', PLOT: 'seedling', BED: 'seedling', CHEST: 'box', PLACE: 'cube' };
const statuses: Record<string, string> = { active: 'Доступен', archived: 'Архив', planned: 'Запланирован', constructing: 'Строится', paused: 'На паузе', damaged: 'Повреждён', destroyed: 'Разрушен' };
const drag = ref<{ start: MapPoint; end: MapPoint; x: number; y: number; moved: boolean; additive: boolean } | null>(null);
let suppressClick = false;
const bounds = computed(() => props.map?.bounds ?? props.node.map ?? { x: -2, y: -2, width: 5, height: 5 });
const width = computed(() => bounds.value.width * size), height = computed(() => bounds.value.height * size);
const nodes = computed(() => props.map?.items ?? []);
const selectedNode = computed(() => selected.value.length === 1 ? nodes.value.find(n => occupiesCell(n, selected.value[0])) : undefined);
const known = computed(() => new Map((props.map?.cells ?? []).map(c => [key(c), c.state])));
const state = (p: MapPoint) => known.value.get(key(p)) ?? 'closed';
const point = computed(() => selected.value.length === 1 ? selected.value[0] : null);
const selectedState = computed(() => point.value ? state(point.value) : null);
const gridCells = computed(() => Array.from({ length: bounds.value.width * bounds.value.height }, (_, i) => ({ x: bounds.value.x + i % bounds.value.width, y: bounds.value.y + Math.floor(i / bounds.value.width) })));
const occupied = (p: MapPoint) => nodes.value.some(n => occupiesCell(n, p));
const allDiscovered = computed(() => selected.value.length > 0 && selected.value.every(p => state(p) === 'discovered' && !occupied(p)));
const price = computed(() => allDiscovered.value && props.map?.pricing ? mapPurchase(props.map.pricing, selected.value.length) : null);
const required = computed(() => point.value ? requiredExplorerLevel(point.value) : 1);
const levelAllowed = computed(() => !!props.map?.exploration?.allowed && (props.map.exploration.level >= required.value));
const elixirAllowed = computed(() => !!props.map?.exploration?.allowed && props.map.exploration.elixir_quantity > 0);
const blocked = computed(() => calculating.value || props.command.busy.value || !!props.command.pending.value || !props.writable);
const position = (p: MapPoint) => ({ x: (p.x - bounds.value.x) * size, y: (bounds.value.y + bounds.value.height - 1 - p.y) * size });
const polygon = (node: WorldNode) => (node.footprint ?? []).map(p => `${(p.x - bounds.value.x) * size},${(bounds.value.y + bounds.value.height - p.y) * size}`).join(' ');
const marquee = computed(() => {
  if (!drag.value?.moved) return null;
  const a = position(drag.value.start), b = position(drag.value.end);
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x) + size, height: Math.abs(a.y - b.y) + size };
});
const cellPrice = (cell: MapPoint) => {
  const index = [...selected.value].sort((a, b) => a.y - b.y || a.x - b.x).findIndex(p => key(p) === key(cell));
  if (!props.map?.pricing) return '';
  return formatCredits(allDiscovered.value && index >= 0 && price.value ? price.value.unitPrices[index] : props.map.pricing.next_price);
};
function choose(p: MapPoint, event?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) {
  error.value = '';
  const mode = event?.shiftKey ? 'range' : event?.ctrlKey || event?.metaKey ? 'toggle' : 'single';
  selected.value = selectMapCells(mode === 'range' && !event?.ctrlKey && !event?.metaKey ? [] : selected.value, p, anchor.value, mode, gridCells.value, props.map?.pricing?.max_quantity ?? 100);
  if (mode !== 'range') anchor.value = p;
}
function pointerCell(event: MouseEvent) {
  const svg = event.currentTarget as SVGSVGElement, matrix = svg.getScreenCTM();
  if (!matrix) return;
  const cursor = svg.createSVGPoint(); cursor.x = event.clientX; cursor.y = event.clientY;
  const local = cursor.matrixTransform(matrix.inverse());
  if (local.x < 0 || local.y < 0 || local.x >= width.value || local.y >= height.value) return;
  return { x: bounds.value.x + Math.floor(local.x / size), y: bounds.value.y + bounds.value.height - 1 - Math.floor(local.y / size) };
}
function clickMap(event: MouseEvent) {
  if (suppressClick) { suppressClick = false; return; }
  const cell = pointerCell(event); if (cell) choose(cell, event);
}
function startArea(event: PointerEvent) {
  suppressClick = false;
  if (event.button !== 0) return;
  const cell = pointerCell(event); if (!cell) return;
  drag.value = { start: cell, end: cell, x: event.clientX, y: event.clientY, moved: false, additive: event.ctrlKey || event.metaKey || event.shiftKey };
  (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
}
function moveArea(event: PointerEvent) {
  if (!drag.value) return;
  const cell = pointerCell(event); if (cell) drag.value.end = cell;
  if (Math.hypot(event.clientX - drag.value.x, event.clientY - drag.value.y) > 6) drag.value.moved = true;
}
function finishArea() {
  if (!drag.value) return;
  if (drag.value.moved) {
    const cells = mapAreaCells(drag.value.start, drag.value.end, gridCells.value, []);
    selected.value = Array.from(new Map([...(drag.value.additive ? selected.value : []), ...cells].map(p => [key(p), p])).values()).slice(0, props.map?.pricing?.max_quantity ?? 100);
    anchor.value = drag.value.start; suppressClick = true;
  }
  drag.value = null;
}
function moveSelection(event: KeyboardEvent) {
  if (event.key === 'Escape') { suppressClick = !!drag.value; drag.value = null; selected.value = []; return; }
  const delta: Record<string, MapPoint> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: 1 }, ArrowDown: { x: 0, y: -1 } };
  if (!delta[event.key]) return;
  event.preventDefault(); const current = selectedNode.value?.coordinates ?? point.value ?? { x: Math.max(bounds.value.x, Math.min(0, bounds.value.x + bounds.value.width - 1)), y: Math.max(bounds.value.y, Math.min(0, bounds.value.y + bounds.value.height - 1)) };
  const next = { x: Math.max(bounds.value.x, Math.min(bounds.value.x + bounds.value.width - 1, current.x + delta[event.key].x)), y: Math.max(bounds.value.y, Math.min(bounds.value.y + bounds.value.height - 1, current.y + delta[event.key].y)) };
  choose(next, event);
}
function selectNode(node: WorldNode, event?: MouseEvent) { if (suppressClick) { suppressClick = false; return; } choose(node.coordinates, event); }
function clearSelection() { selected.value = []; anchor.value = null; droppedCrop.value = null; }
function dropSeed(event: DragEvent, node: WorldNode) {
  if (node.type !== 'BED' || !node.details.unlocked || !node.permissions.storage) return;
  const id = Number(event.dataTransfer?.getData('application/x-ablaki-crop'));
  if (!Number.isSafeInteger(id) || id < 1) return;
  choose(node.coordinates); droppedCrop.value = { id, sequence: ++dropSequence };
}
async function act(action: 'explore' | 'buy', elixir = false) {
  if (blocked.value || !selected.value.length || !props.map?.can_expand) return;
  if (action === 'explore' && (!point.value || !(elixir ? elixirAllowed.value : levelAllowed.value))) return;
  if (action === 'buy' && !price.value) return;
  const expectedPrice = action === 'buy' ? price.value!.total : '0.0000';
  const input = { cells: selected.value.map(p => ({ x: p.x, y: p.y })), top_up: topUp.value, use_elixir: elixir };
  const current = ++generation, id = props.node.id; calculating.value = true; error.value = '';
  try {
    const quote = await previewMapCells(id, action, input);
    if (current !== generation || !props.writable) return;
    if (quote.terms.price !== expectedPrice) { error.value = 'Цена изменилась. Обновите карту перед покупкой.'; return; }
    await props.command.submit(`/nodes/${id}/map-${action}`, input, quote);
  } catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) calculating.value = false; }
}
watch(() => props.selection, value => { if (value && JSON.stringify(value) !== JSON.stringify(selected.value)) selected.value = value; });
async function progress() {
  if (!explorer.value || blocked.value) return;
  const action = explorer.value.enrolled ? 'level-up' : 'enroll', id = explorer.value.id;
  const current = ++generation; calculating.value = true; error.value = '';
  try { const quote = await previewProfession(id, action); if (current === generation) await props.command.submit(`/professions/${id}/${action}`, {}, quote); }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) calculating.value = false; }
}
watch(() => props.node.id, () => { generation++; calculating.value = false; selected.value = []; anchor.value = null; error.value = ''; }, { flush: 'sync' });
onScopeDispose(() => { generation++; });
</script>

<template lang="pug">
.world-map-layout
  .world-map-main
    .world-map-window
      svg.world-map-board(:viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="xMidYMid meet" role="group" tabindex="0" :aria-label="`Карта ${node.label}. Выделите ячейки рамкой. Стрелки — выбор ячейки, Shift или Ctrl — несколько ячеек, Escape — снять выделение.`" @pointerdown="startArea" @pointermove="moveArea" @pointerup="finishArea" @pointercancel="drag = null" @lostpointercapture="drag = null" @click="clickMap" @keydown="moveSelection")
        defs
          pattern(:id="`world-fog-${node.id}`" width="10" height="10" patternUnits="userSpaceOnUse")
            rect(width="10" height="10" class="map-closed")
            path(d="M-2 2 L2 -2 M0 10 L10 0 M8 12 L12 8" class="map-fog-stripe")
          pattern(:id="`world-grid-${node.id}`" :width="size" :height="size" patternUnits="userSpaceOnUse")
            rect(:width="size" :height="size" class="map-closed")
            path(:d="`M ${size} 0 L 0 0 0 ${size}`" class="map-grid")
        rect(:width="width" :height="height" :fill="`url(#world-grid-${node.id})`")
        g(v-for="cell in gridCells" :key="key(cell)" :transform="`translate(${position(cell).x},${position(cell).y})`" class="map-cell")
          rect(:width="size" :height="size" :class="state(cell) === 'closed' ? 'map-fog' : `map-${state(cell)}`" :fill="state(cell) === 'closed' ? `url(#world-fog-${node.id})` : undefined")
          text(v-if="state(cell) === 'discovered' && !occupied(cell)" :x="size - 5" y="15" text-anchor="end" class="map-price") {{ cellPrice(cell) }} Cr
          text(v-if="!occupied(cell)" :x="size / 2" y="49" text-anchor="middle" class="map-cell-status") {{ state(cell) === 'open' ? 'Свободно' : state(cell) === 'discovered' ? 'К покупке' : '' }}
          text(v-if="!occupied(cell)" x="6" :y="size - 7" class="map-coordinate") {{ cell.x }}, {{ cell.y }}
          title Ячейка {{ cell.x }}, {{ cell.y }}
        rect(v-for="cell in selected" :key="`selected-${key(cell)}`" :x="position(cell).x + 2" :y="position(cell).y + 2" :width="size - 4" :height="size - 4" class="map-selected")
        polygon(v-for="child in nodes.filter(n => n.footprint)" :key="`shape-${child.id}`" :points="polygon(child)" class="map-footprint" @click.stop="selectNode(child, $event)")
        g(v-for="child in nodes" :key="child.id" :transform="`translate(${position(child.coordinates).x},${position(child.coordinates).y})`" class="map-object" :class="{ owned: child.owned_by_me, active: selected.some(p => occupiesCell(child, p)) }" role="button" tabindex="0" :aria-label="`${nodeLabels[child.type]}: ${child.label}`" @click.stop="selectNode(child, $event)" @keydown.enter.stop="selectNode(child)" @keydown.space.prevent.stop="selectNode(child)" @dragover.prevent @drop.prevent.stop="dropSeed($event, child)")
          rect(x="3" y="3" :width="size - 6" :height="size - 6" rx="6")
          font-awesome-icon(:icon="icons[child.type]" x="32" y="13" width="24" height="24" aria-hidden="true")
          text(:x="size / 2" y="55" text-anchor="middle" class="map-object-label") {{ child.label.length > 12 ? child.label.slice(0, 11) + '…' : child.label }}
          text(:x="size / 2" y="69" text-anchor="middle" class="map-cell-status") {{ child.type === 'BED' && !child.details.unlocked ? 'Закрыта' : statuses[child.status] || 'Недоступен' }}
          text(x="7" y="82" class="map-coordinate") {{ child.coordinates.x }}, {{ child.coordinates.y }}
          title {{ child.label }} · {{ child.coordinates.x }}, {{ child.coordinates.y }}
        rect(v-if="marquee" v-bind="marquee" class="map-marquee")
    slot(name="placement")
  aside.world-map-inspector(aria-live="polite")
    button.world-inspector-close(v-if="selected.length" type="button" aria-label="Снять выделение" @click="clearSelection") ×
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
      router-link(v-if="selectedNode.permissions.storage && selectedNode.type !== 'BED'" :to="`/world/nodes/${selectedNode.id}#workshop`") Вещи и размещение
      router-link(v-if="selectedNode.owned_by_me && selectedNode.status === 'active' && ['PLOT', 'BUILDING', 'ROOM'].includes(selectedNode.type)" :to="`/world/workspace/${selectedNode.id}`") Крафт в этом месте
      world-cultivation-panel(v-if="selectedNode.type === 'BED' && selectedNode.permissions.storage && selectedNode.details.unlocked" :key="selectedNode.id" :bed-id="selectedNode.id" :session="session ?? 0" :command="command" :dropped-crop="droppedCrop")
      router-link(v-else-if="selectedNode.type === 'BED' && node.permissions.storage" :to="`/world/nodes/${node.id}#development`") Открыть грядку
    template(v-else-if="selected.length")
      span.world-map-kicker {{ point ? `Ячейка ${point.x}, ${point.y}` : `Выбрано ячеек: ${selected.length}` }}
      h3 {{ selectedState === 'open' ? 'Свободная ячейка' : allDiscovered ? 'Можно купить' : point ? 'Не исследована' : 'Выбранная область' }}
      template(v-if="!point && !allDiscovered")
        p Открытые: {{ selected.filter(p => state(p) === 'open').length }} · К покупке: {{ selected.filter(p => state(p) === 'discovered').length }}
        n-button(v-if="selected.some(p => state(p) === 'discovered')" @click="selected = selected.filter(p => state(p) === 'discovered' && !occupied(p))") Оставить ячейки к покупке
      p(v-if="selectedState === 'open'") Здесь можно разместить объект подходящего типа.
      p(v-else-if="!map?.can_expand") {{ map?.exploration?.reason || 'Ячейки открываются через развитие объекта.' }}
      template(v-else-if="selectedState === 'closed'")
        p Нужен исследователь {{ required }}-го уровня. Ваш уровень: {{ map?.exploration?.level ?? 0 }}.
        template(v-if="explorer && !levelAllowed")
          p(v-if="explorer.enrolled && explorer.next") Опыт: {{ explorer.xp }} / {{ explorer.next.required_xp }}. За исследование — 10 XP.
          n-button(v-if="!explorer.enrolled || explorer.next" :disabled="blocked || (explorer.enrolled && !explorer.next?.available)" @click="progress") {{ explorer.enrolled ? `Повысить до ${explorer.next?.level} · бесплатно` : 'Стать исследователем · бесплатно' }}
        n-button(type="primary" :loading="calculating" :disabled="blocked || !levelAllowed" @click="act('explore')") Исследовать · бесплатно
        n-button(v-if="!levelAllowed" :loading="calculating" :disabled="blocked || !elixirAllowed" @click="act('explore', true)") Применить эликсир · 1 шт.
        p(v-if="!levelAllowed") В рюкзаке эликсиров: {{ map?.exploration?.elixir_quantity ?? 0 }}
      template(v-else-if="allDiscovered && price")
        p.map-total {{ formatCredits(price.total) }} Cr
        p(v-if="price.discount !== '0.0000'") Скидка 5%: {{ formatCredits(price.discount) }} Cr
        p(v-else) От трёх ячеек — скидка 5%.
        n-checkbox(v-model:checked="topUp" :disabled="blocked") Недостающую сумму взять с личного баланса
        n-button(type="primary" :loading="calculating" :disabled="blocked" @click="act('buy')") Купить {{ selected.length }} · {{ formatCredits(price.total) }} Cr
    template(v-else)
      span.world-map-kicker Команды
      h3 Выберите цель
      p Нажмите на объект или выделите ячейки рамкой. Здесь появятся доступные действия и их стоимость.
    p(v-if="!writable") Только просмотр: действия с миром временно недоступны.
    n-alert(v-if="error" type="error" role="alert") {{ error }}
</template>

<style scoped>
.world-map-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(15rem, 21rem); gap: 1rem; align-items: start; }
.world-map-main { min-width: 0; }
.world-map-window { height: clamp(15rem, 54vh, 34rem); padding: .4rem; border: 1px solid var(--border); border-radius: .65rem; background: var(--bg-base); overflow: hidden; }
.world-map-board { display: block; width: 100%; height: 100%; cursor: crosshair; touch-action: none; user-select: none; }
.world-map-tools { display: flex; gap: .6rem; flex-wrap: wrap; align-items: center; margin-top: .6rem; }
.map-marquee { fill: var(--primary-soft); fill-opacity: .4; stroke: var(--primary); stroke-width: 2; stroke-dasharray: 5 3; pointer-events: none; }
.map-cell-status { fill: var(--text-muted); font-size: 10px; pointer-events: none; }
.world-object-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: .5rem; max-height: 15rem; overflow: auto; padding: 3px; }
.world-object-tile { display: grid; gap: .35rem; justify-items: start; padding: .7rem; border: 1px solid var(--border); border-radius: .5rem; color: var(--text); background: var(--bg-surface); cursor: pointer; text-align: left; overflow-wrap: anywhere; }
.world-object-tile > svg { color: var(--primary); font-size: 1.4rem; }
.world-object-tile small { color: var(--text-muted); }
.world-object-tile.active, .world-object-tile:focus-visible { outline: 2px solid var(--primary); background: var(--primary-soft); }
.map-object { color: var(--primary); cursor: pointer; }
.map-closed { fill: var(--bg-base); }
.map-grid { fill: none; stroke: var(--border); stroke-width: 1; }
.map-fog-stripe { stroke: var(--text-muted); stroke-opacity: .22; stroke-width: 3; }
.map-coordinate { fill: var(--text-muted); font-size: 10px; }
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
.world-map-inspector { position: relative; display: grid; gap: .75rem; min-height: 13rem; padding: 1rem; border: 1px solid var(--border); border-radius: .65rem; background: var(--bg-surface); }
.world-inspector-close { position: absolute; top: .35rem; right: .45rem; border: 0; background: transparent; color: var(--text-muted); font-size: 1.6rem; cursor: pointer; }
.world-map-inspector h3, .world-map-inspector p { margin: 0; }
.world-map-kicker { color: var(--primary); font-size: .8rem; font-weight: 700; }
.world-map-inspector dl { display: grid; grid-template-columns: 1fr auto; gap: .45rem .8rem; margin: 0; }
.world-map-inspector dt { color: var(--text-muted); }
.world-map-inspector dd { margin: 0; text-align: right; }
.world-map-open { display: block; padding: .65rem; border-radius: .4rem; background: var(--primary); color: white; text-align: center; }
.map-total { font-size: 1.5rem; font-weight: 700; }
@media (max-width: 760px) { .world-map-layout { grid-template-columns: 1fr; } }
</style>

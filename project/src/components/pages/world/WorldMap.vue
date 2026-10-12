<script setup lang="ts">
import { worldActionButtonTheme } from '@/entities/world/theme';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton, NCheckbox } from 'naive-ui';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import type { WorldMapData, WorldNode } from '@/entities/world/types';
import { occupiesCell } from '@/entities/world/coordinates';
import type { MapPoint } from '@/entities/world/coordinates';
import { nodeLabels } from '@/entities/world/types';
import { discountedCredits, formatCredits } from '@/entities/world/credits';
import { loadGarden, previewGarden } from '@/services/api/worldGarden';
import { mapAreaCells, mapPurchase, requiredExplorerLevel, selectMapCells } from '@/entities/world/mapSelection';
import { loadExplorer, previewProfession, previewMapCells, worldError } from '@/services/api/world';
import WorldCultivationPanel from './WorldCultivationPanel.vue';
import WorldHelpHint from './WorldHelpHint.vue';
import WorldObjectPreview from './WorldObjectPreview.vue';
import WorldRepairPanel from './WorldRepairPanel.vue';
import WorldPlacedItemPanel from './WorldPlacedItemPanel.vue';
import { useStore } from 'vuex';

const props = defineProps<{ node: WorldNode; map: WorldMapData | null; writable: boolean; command: WorldCommandRunner; selection?: MapPoint[]; session?: number }>();
const emit = defineEmits<{ 'update:selection': [MapPoint[]]; changed: [ids: number[]] }>();
const auth = useStore(), owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0));
const selected = ref<MapPoint[]>(props.selection ?? []), anchor = ref<MapPoint | null>(null);
const topUp = ref(true), calculating = ref(false), error = ref(''), droppedCrop = ref<{ id: number; sequence: number } | null>(null);
const explorer = ref<Awaited<ReturnType<typeof loadExplorer>>>(null);
const garden = ref<Awaited<ReturnType<typeof loadGarden>> | null>(null), gardenLoading = ref(false), gardenError = ref('');
// Adapter for already purchased legacy beds; new maps always use common exploration.
const isGarden = computed(() => Boolean(props.node.extensions?.includes('garden') && props.map?.items.some(node => node.type === 'BED' && !node.details.unlocked)));
let gardenGeneration = 0, explorerGeneration = 0;
async function refreshGarden() {
  const current = ++gardenGeneration; garden.value = null; gardenError.value = '';
  if (!isGarden.value || !props.node.permissions.storage) { gardenLoading.value = false; return; }
  gardenLoading.value = true;
  try { const result = await loadGarden(props.node.id); if (current === gardenGeneration) garden.value = result; }
  catch (cause) { if (current === gardenGeneration) gardenError.value = worldError(cause); }
  finally { if (current === gardenGeneration) gardenLoading.value = false; }
}
watch([() => props.node.id, () => props.node.revision, () => props.session], refreshGarden, { immediate: true });
let generation = 0, dropSequence = 0;
watch(selected, value => { generation++; calculating.value = false; error.value = ''; emit('update:selection', value); }, { flush: 'sync' });
watch([() => props.map?.exploration?.allowed, () => props.node.id, () => props.session], async ([allowed]) => {
  const current = ++explorerGeneration; explorer.value = null; if (!allowed) return;
  try { const result = await loadExplorer(); if (current === explorerGeneration) explorer.value = result; }
  catch { /* The map still provides authoritative exploration requirements. */ }
}, { immediate: true });
const size = 88, key = (p: MapPoint) => `${p.x}:${p.y}`;
const icons = { WORLD: 'sun', REGION: 'mountain', SETTLEMENT: 'city', BUILDING: 'house', ROOM: 'house', PLOT: 'seedling', BED: 'seedling', CHEST: 'box', PLACE: 'cube' };
const statuses: Record<string, string> = { active: 'Доступен', archived: 'Архив', planned: 'Запланирован', constructing: 'Строится', paused: 'На паузе', damaged: 'Повреждён', destroyed: 'Разрушен' };
const drag = ref<{ start: MapPoint; end: MapPoint; x: number; y: number; moved: boolean; additive: boolean } | null>(null);
let suppressClick = false;
const bounds = computed(() => props.map?.bounds ?? props.node.map ?? { x: -2, y: -2, width: 5, height: 5 });
const width = computed(() => bounds.value.width * size), height = computed(() => bounds.value.height * size);
const nodes = computed(() => (props.map?.items ?? []).filter(node => node.status !== 'archived'));
const selectedNode = computed(() => selected.value.length === 1 ? nodes.value.find(n => occupiesCell(n, selected.value[0])) : undefined);
const known = computed(() => new Map((props.map?.cells ?? []).map(c => [key(c), c.state])));
const state = (p: MapPoint) => known.value.get(key(p)) ?? 'closed';
const point = computed(() => selected.value.length === 1 ? selected.value[0] : null);
const lockedBed = (node: WorldNode) => node.type === 'BED' && !node.details.unlocked;
const visibleState = (cell: MapPoint) => nodes.value.some(node => lockedBed(node) && occupiesCell(node, cell)) ? 'closed' : state(cell);
const selectedState = computed(() => point.value ? state(point.value) : null);
const gridCells = computed(() => Array.from({ length: bounds.value.width * bounds.value.height }, (_, i) => ({ x: bounds.value.x + i % bounds.value.width, y: bounds.value.y + Math.floor(i / bounds.value.width) })));
const equipment = (p: MapPoint) => props.map?.equipment_cells?.find(cell => cell.x === p.x && cell.y === p.y);
const selectedItem = computed(() => point.value ? equipment(point.value) : undefined);
const occupied = (p: MapPoint) => nodes.value.some(n => occupiesCell(n, p)) || equipment(p);
const allDiscovered = computed(() => selected.value.length > 0 && selected.value.every(p => state(p) === 'discovered' && !occupied(p)));
const selectedBeds = computed(() => selected.value.map(p => nodes.value.find(n => lockedBed(n) && occupiesCell(n, p))).filter((n): n is WorldNode => !!n));
const gardenSelection = computed(() => isGarden.value && selected.value.length > 0 && selectedBeds.value.length === selected.value.length && new Set(selectedBeds.value.map(n => n.id)).size === selected.value.length && selectedBeds.value.every(n => garden.value?.garden?.beds.some(b => b.node_id === n.id && !b.unlocked)));
const price = computed(() => {
  if (gardenSelection.value) {
    const prices = selectedBeds.value.map(n => garden.value!.garden!.beds.find(b => b.node_id === n.id)!.price);
    const gross = discountedCredits(prices), total = discountedCredits(prices, prices.length >= 3 ? 500 : 0), units = BigInt(gross.replace('.', '')) - BigInt(total.replace('.', ''));
    return { total, gross, discount: `${units / 10000n}.${String(units % 10000n).padStart(4, '0')}`, unitPrices: prices };
  }
  return allDiscovered.value && props.map?.pricing ? mapPurchase(props.map.pricing, [...selected.value].sort((a, b) => a.y - b.y || a.x - b.x)) : null;
});
const allClosed = computed(() => selected.value.length > 0 && selected.value.every(p => state(p) === 'closed' && !occupied(p)));
const required = computed(() => Math.max(1, ...selected.value.map(requiredExplorerLevel)));
const levelAllowed = computed(() => !!props.map?.exploration?.allowed && (props.map.exploration.level >= required.value));
const neededElixirs = computed(() => selected.value.filter(p => requiredExplorerLevel(p) > (props.map?.exploration?.level ?? 0)).length);
const elixirAllowed = computed(() => !!props.map?.exploration?.allowed && neededElixirs.value > 0 && props.map.exploration.elixir_quantity >= neededElixirs.value);
const blocked = computed(() => calculating.value || gardenLoading.value || props.command.busy.value || !!props.command.pending.value || !props.writable);
const canBuy = computed(() => !!price.value && (gardenSelection.value ? !!garden.value?.can_expand : !!props.map?.can_expand));
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
  return formatCredits(allDiscovered.value && index >= 0 && price.value ? price.value.unitPrices[index] : mapPurchase(props.map.pricing, [cell]).total);
};
function choose(p: MapPoint, event?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) {
  error.value = '';
  const mode = event?.shiftKey ? 'range' : event?.ctrlKey || event?.metaKey ? 'toggle' : 'single';
  const origin = mode === 'range' ? anchor.value ?? p : selected.value[0] ?? p;
  const available = mode === 'single' ? gridCells.value : selectableArea(areaOrigin(origin, p));
  if (mode !== 'single' && !available.some(cell => key(cell) === key(p))) return;
  selected.value = selectMapCells(mode === 'range' && !event?.ctrlKey && !event?.metaKey ? [] : selected.value.filter(cell => available.some(p => key(p) === key(cell))), p, anchor.value, mode, available, props.map?.pricing?.max_quantity ?? 100);
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
    const available = selectableArea(areaOrigin(drag.value.start, drag.value.end));
    const cells = mapAreaCells(drag.value.start, drag.value.end, available, []);
    selected.value = Array.from(new Map([...(drag.value.additive ? selected.value.filter(p => available.some(cell => key(p) === key(cell))) : []), ...cells].map(p => [key(p), p])).values()).slice(0, props.map?.pricing?.max_quantity ?? 100);
    anchor.value = drag.value.start; suppressClick = true;
  }
  drag.value = null;
}
function selectableArea(origin: MapPoint) {
  const kind = visibleState(origin);
  return gridCells.value.filter(cell => visibleState(cell) === kind && areaEligible(cell));
}
function areaEligible(cell: MapPoint) {
  return !equipment(cell) && (!occupied(cell) || (isGarden.value && nodes.value.some(node => lockedBed(node) && occupiesCell(node, cell))));
}
function areaOrigin(from: MapPoint, to: MapPoint) {
  if (areaEligible(from)) return from;
  if (areaEligible(to)) return to;
  return mapAreaCells(from, to, gridCells.value.filter(areaEligible), [])[0] ?? from;
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
async function act(action: 'explore' | 'buy') {
  const elixir = action === 'explore' && !levelAllowed.value && elixirAllowed.value;
  if (blocked.value || !selected.value.length) return;
  if (action === 'explore' && (!props.map?.can_expand || !allClosed.value || !(elixir ? elixirAllowed.value : levelAllowed.value))) return;
  if (action === 'buy' && !canBuy.value) return;
  const expectedPrice = action === 'buy' ? price.value!.total : '0.0000';
  const input = { cells: selected.value.map(p => ({ x: p.x, y: p.y })), top_up: topUp.value, use_elixir: elixir };
  const current = ++generation, id = props.node.id; calculating.value = true; error.value = '';
  try {
    if (action === 'buy' && gardenSelection.value) {
      const payload = { quantity: selected.value.length, bed_ids: selectedBeds.value.map(n => n.id).sort((a, b) => a - b), top_up: topUp.value };
      const result = await previewGarden(id, 'expand', payload);
      if (current !== generation || !props.writable) return;
      if (result.payment?.total !== expectedPrice) { error.value = 'Цена изменилась. Обновите карту перед покупкой.'; return; }
      await props.command.submit(`/nodes/${id}/garden-expand`, payload, result.quote);
      if (current === generation && !props.command.pending.value && !props.command.error.value) void refreshGarden();
      return;
    }
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
  try {
    const quote = await previewProfession(id, action);
    if (current === generation) {
      const result = await props.command.submit(`/professions/${id}/${action}`, {}, quote);
      if (result && current === generation) explorer.value = await loadExplorer();
    }
  }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) calculating.value = false; }
}
watch([() => props.node.id, () => props.session], () => { generation++; calculating.value = false; selected.value = []; anchor.value = null; error.value = ''; }, { flush: 'sync' });
watch(() => props.writable, () => { generation++; calculating.value = false; }, { flush: 'sync' });
onScopeDispose(() => { generation++; gardenGeneration++; explorerGeneration++; });
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
          rect(:width="size" :height="size" :class="visibleState(cell) === 'closed' ? 'map-fog' : `map-${visibleState(cell)}`" :fill="visibleState(cell) === 'closed' ? `url(#world-fog-${node.id})` : undefined")
          text(v-if="state(cell) === 'discovered' && !occupied(cell)" :x="size - 5" y="15" text-anchor="end" class="map-price") {{ cellPrice(cell) }} Cr
          text(v-if="!occupied(cell)" :x="size / 2" y="49" text-anchor="middle" class="map-cell-status") {{ state(cell) === 'open' ? 'Свободно' : state(cell) === 'discovered' ? 'К покупке' : '' }}
          text(v-if="!occupied(cell)" x="6" :y="size - 7" class="map-coordinate") {{ cell.x }}, {{ cell.y }}
          rect.map-equipment-surface(v-if="equipment(cell)" x="3" y="3" :width="size - 6" :height="size - 6" rx="6")
          font-awesome-icon.map-equipment-icon(v-if="equipment(cell)" :icon="equipment(cell)?.icon || 'cube'" x="32" y="16" width="24" height="24" aria-hidden="true")
          text(v-if="equipment(cell)" :x="size / 2" y="57" text-anchor="middle" class="map-object-label map-equipment-label") {{ (equipment(cell)?.name || 'Предмет').slice(0, 12) }}
          title Ячейка {{ cell.x }}, {{ cell.y }}
        rect(v-for="cell in selected" :key="`selected-${key(cell)}`" :x="position(cell).x + 2" :y="position(cell).y + 2" :width="size - 4" :height="size - 4" class="map-selected")
        polygon(v-for="child in nodes.filter(n => n.footprint)" :key="`shape-${child.id}`" :points="polygon(child)" class="map-footprint" :class="{ locked: lockedBed(child) }" @click.stop="selectNode(child, $event)")
        g(v-for="child in nodes" :key="child.id" :transform="`translate(${position(child.coordinates).x},${position(child.coordinates).y})`" class="map-object" :class="{ owned: child.owned_by_me, locked: lockedBed(child), active: selected.some(p => occupiesCell(child, p)) }" role="button" tabindex="0" :aria-label="`${nodeLabels[child.type]}: ${child.label}. ${lockedBed(child) ? 'Закрыта' : statuses[child.status] || child.status}`" @click.stop="selectNode(child, $event)" @keydown.enter.stop="selectNode(child)" @keydown.space.prevent.stop="selectNode(child)" @dragover.prevent @drop.prevent.stop="dropSeed($event, child)")
          rect(x="3" y="3" :width="size - 6" :height="size - 6" rx="6")
          font-awesome-icon(:icon="lockedBed(child) ? 'lock' : icons[child.type]" x="32" y="13" width="24" height="24" aria-hidden="true")
          font-awesome-icon(v-if="child.status === 'constructing'" icon="hammer" x="64" y="8" width="16" height="16" aria-hidden="true")
          text(:x="size / 2" y="55" text-anchor="middle" class="map-object-label") {{ child.label.length > 12 ? child.label.slice(0, 11) + '…' : child.label }}
          text(:x="size / 2" y="69" text-anchor="middle" class="map-cell-status") {{ child.type === 'BED' && !child.details.unlocked ? 'Закрыта' : statuses[child.status] || 'Недоступен' }}
          text(x="7" y="82" class="map-coordinate") {{ child.coordinates.x }}, {{ child.coordinates.y }}
          title {{ child.label }} · {{ child.coordinates.x }}, {{ child.coordinates.y }}
        rect(v-if="marquee" v-bind="marquee" class="map-marquee")
    slot(name="placement")
  aside.world-map-inspector(aria-live="polite")
    slot(name="information")
    button.world-inspector-close(v-if="selected.length" type="button" aria-label="Снять выделение" @click="clearSelection") ×
    template(v-if="selectedNode")
      h3.world-selected-heading
        font-awesome-icon(:icon="icons[selectedNode.type]" :title="nodeLabels[selectedNode.type]" aria-hidden="true")
        span {{ selectedNode.label }}
      world-object-preview(:node="selectedNode")
      world-repair-panel(:key="selectedNode.id" :node="selectedNode" :owner="owner" :session="session ?? 0" :writable="writable" @changed="emit('changed', [selectedNode.id])")
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
      router-link(v-if="selectedNode.permissions.storage" :to="`/world/nodes/${selectedNode.id}#workshop`") Вещи и размещение
      router-link(v-if="selectedNode.owned_by_me && selectedNode.status === 'active'" :to="`/world/workspace/${selectedNode.id}`") Изготовление в объекте
      world-cultivation-panel(v-if="selectedNode.extensions?.includes('cultivation') && selectedNode.permissions.storage" :key="selectedNode.id" :bed-id="selectedNode.id" :session="session ?? 0" :command="command" :dropped-crop="droppedCrop")
    world-placed-item-panel(v-else-if="selectedItem" :item="selectedItem" :node-id="node.id" :session="session ?? 0" :command="command" :writable="writable" @changed="emit('changed', $event)")
    template(v-else-if="selected.length")
      span.world-map-kicker {{ point ? `Ячейка ${point.x}, ${point.y}` : `Выбрано ячеек: ${selected.length}` }}
      h3 {{ point && equipment(point) ? 'Занято оборудованием' : selectedState === 'open' ? 'Свободная ячейка' : allDiscovered ? 'Можно купить' : point ? 'Не исследована' : 'Выбранная область' }}
    template(v-else-if="node.status !== 'constructing'")
      span.world-map-kicker Команды
      h3 Выберите цель
    section.map-opening(v-if="selected.length && !selectedItem && (!selectedNode || lockedBed(selectedNode))")
      .explore-action
        h4 Открытие ячеек
        world-help-hint(label="Исследование и покупка ячеек" symbol="!")
          p Выделите одну или несколько ячеек рамкой, с Shift или Ctrl. Для открытия выбирайте ячейки одинакового состояния.
          p(v-if="isGarden") Закрытые грядки уже исследованы. Покупаются именно выбранные грядки за бюджет огорода.
          p(v-else) Неисследованные ячейки сначала исследуйте, затем купите. Нужен исследователь {{ required }}-го уровня; ваш уровень — {{ map?.exploration?.level ?? 0 }}.
          p(v-if="!isGarden") Если уровня недостаточно, автоматически расходуется один эликсир на каждую ячейку выше вашего уровня. Требуется {{ neededElixirs }}, в рюкзаке {{ map?.exploration?.elixir_quantity ?? 0 }}. При достаточном уровне эликсир не расходуется.
          p Ближайшее кольцо ячеек стоит одинаково. Каждое следующее кольцо дороже на базовую цену. Оплата из бюджета объекта; галочка разрешает доплату с личного баланса. От трёх ячеек — скидка 5%.
          p(v-if="price && price.discount !== '0.0000'") Скидка: {{ formatCredits(price.discount) }} Cr.
          p(v-if="!canBuy && !allClosed") {{ map?.exploration?.reason || 'Выделите закрытые либо исследованные свободные ячейки.' }}
          p(v-if="!isGarden && !map?.exploration?.allowed") {{ map?.exploration?.reason || 'Исследование этой карты пока недоступно.' }}
          p(v-if="!writable") Только просмотр: действия временно недоступны.
      n-button(:theme-overrides="worldActionButtonTheme" v-if="!isGarden && selected.some(p => state(p) === 'closed')" type="primary" :loading="calculating" :disabled="blocked || !map?.can_expand || !allClosed || (!levelAllowed && !elixirAllowed)" @click="act('explore')") {{ !levelAllowed && elixirAllowed ? `Исследовать ${selected.length} · ${neededElixirs} эликс.` : `Исследовать ${selected.length}` }}
      template(v-if="isGarden || selected.some(p => state(p) === 'discovered')")
        p(v-if="price") {{ selected.length }} ячеек: {{ formatCredits(price.gross) }} Cr − {{ formatCredits(price.discount) }} Cr скидки = {{ formatCredits(price.total) }} Cr
        n-checkbox(v-model:checked="topUp" :disabled="blocked") Недостающую сумму взять с личного баланса
        n-button(:theme-overrides="worldActionButtonTheme" type="primary" :loading="calculating" :disabled="blocked || !canBuy" @click="act('buy')") Купить {{ selected.length }} · {{ formatCredits(price?.total) }} Cr
      n-button(:theme-overrides="worldActionButtonTheme" v-if="explorer && !isGarden && allClosed && !levelAllowed && !elixirAllowed && (!explorer.enrolled || explorer.next?.available)" :disabled="blocked" @click="progress") {{ explorer.enrolled ? `Повысить уровень до ${explorer.next?.level}` : 'Открыть профессию «Исследователь»' }}
    world-help-hint(v-else-if="!selected.length && node.status !== 'constructing'" label="Как выбрать ячейки" symbol="!")
      p Нажмите на ячейку или выделите несколько рамкой, с Shift или Ctrl. Доступные действия и стоимость появятся здесь.
    n-alert(v-if="error || gardenError" type="error" role="alert") {{ error || gardenError }}
    n-button(:theme-overrides="worldActionButtonTheme" v-if="gardenError" :disabled="blocked" @click="refreshGarden") Обновить карту
</template>

<style scoped>
.world-map-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(15rem, 21rem); gap: 1rem; align-items: start; }
.map-opening { display: grid; gap: .75rem; }
.map-opening h4 { margin: 0; }
.world-map-main { min-width: 0; }
.world-map-window { height: clamp(15rem, 54vh, 34rem); padding: .4rem; border: 1px solid var(--border); border-radius: .65rem; background: var(--bg-base); overflow: hidden; }
.world-map-board { display: block; width: 100%; height: 100%; cursor: crosshair; touch-action: none; user-select: none; }
.world-map-board:focus, .map-object:focus { outline: none; }
.world-map-board:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
.map-object:focus-visible rect { stroke-width: 4; }
.explore-action { display: flex; flex-wrap: wrap; align-items: start; gap: .5rem; }
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
.map-footprint.locked { fill: var(--bg-base); stroke: var(--border); stroke-dasharray: 5 3; }
.map-object.locked { color: var(--text-muted); }
.map-object.locked rect { fill: var(--bg-base); stroke: var(--border); stroke-dasharray: 4 3; }
.map-object.locked text { fill: var(--text-muted); }
.map-object.active rect { stroke-width: 3; }
.map-object text { fill: var(--primary); pointer-events: none; }
.map-object-symbol { font-size: 27px; }
.map-object-label { font-size: 11px; fill: var(--text); }
.map-equipment-surface { fill: var(--primary-soft); stroke: var(--primary); }
.map-equipment-icon { color: white; }
.map-equipment-label { fill: white; }
.world-map-hint { margin: .55rem 0; color: var(--text-muted); font-size: .8rem; }
.world-map-inspector { position: relative; display: grid; gap: .75rem; min-height: 13rem; padding: 1rem; border: 1px solid var(--border); border-radius: .65rem; background: var(--bg-surface); }
.world-inspector-close:hover { background: var(--primary-soft); color: var(--primary-hover); }
.world-inspector-close { position: absolute; top: .35rem; right: .45rem; width: 2.25rem; height: 2.25rem; display: grid; place-items: center; border: 0; border-radius: .375rem; background: transparent; color: var(--primary); font-size: 1.6rem; cursor: pointer; }
.world-map-inspector h3, .world-map-inspector p { margin: 0; }
.world-map-kicker { color: var(--primary); font-size: .8rem; font-weight: 700; }
.world-selected-heading { display: flex; align-items: center; gap: .5rem; }
.world-map-inspector dl { display: grid; grid-template-columns: 1fr auto; gap: .45rem .8rem; margin: 0; }
.world-map-inspector dt { color: var(--text-muted); }
.world-map-inspector dd { margin: 0; text-align: right; }
.world-map-open { display: block; padding: .65rem; border-radius: .4rem; background: var(--primary); color: white; text-align: center; }
.map-total { font-size: 1.5rem; font-weight: 700; }
@media (max-width: 760px) { .world-map-layout { grid-template-columns: 1fr; } }
</style>

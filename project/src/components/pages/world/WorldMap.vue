<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NCheckbox } from 'naive-ui';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import type { WorldMapData, WorldNode, WorldQuote } from '@/entities/world/types';
import { nodeLabels } from '@/entities/world/types';
import { previewMapCell, worldError } from '@/services/api/world';

const props = defineProps<{ node: WorldNode; map: WorldMapData | null; writable: boolean; command: WorldCommandRunner }>();
const selectedNodeId = ref<number | null>(null), selectedCell = ref<{ x: number; y: number } | null>(null);
const center = ref<{ x: number; y: number } | null>(null), topUp = ref(false);
const quote = shallowRef<{ action: 'explore' | 'buy'; input: { x: number; y: number; top_up: boolean }; value: WorldQuote } | null>(null);
const calculating = ref(false), error = ref('');
let generation = 0;
const cellSize = 72;
const nodes = computed(() => props.map?.items ?? []);
const selectedNode = computed(() => nodes.value.find(node => node.id === selectedNodeId.value) ?? null);
const cellStates = computed(() => new Map((props.map?.cells ?? []).map(cell => [`${cell.x}:${cell.y}`, cell.state])));
const selectedState = computed(() => selectedCell.value ? cellStates.value.get(`${selectedCell.value.x}:${selectedCell.value.y}`) ?? 'closed' : null);
const bounds = computed(() => {
  const points = [...nodes.value.map(node => node.coordinates), ...(props.map?.cells ?? [])];
  for (const node of nodes.value) if (node.footprint) points.push(...node.footprint);
  let minimumX = 0, maximumX = 0, minimumY = 0, maximumY = 0;
  for (const point of points) {
    minimumX = Math.min(minimumX, point.x); maximumX = Math.max(maximumX, point.x);
    minimumY = Math.min(minimumY, point.y); maximumY = Math.max(maximumY, point.y);
  }
  const x = center.value?.x ?? nodes.value[0]?.coordinates.x ?? Math.floor((minimumX + maximumX) / 2);
  const y = center.value?.y ?? nodes.value[0]?.coordinates.y ?? Math.floor((minimumY + maximumY) / 2);
  return {
    minX: maximumX - minimumX < 13 ? minimumX - 2 : x - 7,
    maxX: maximumX - minimumX < 13 ? maximumX + 2 : x + 7,
    minY: maximumY - minimumY < 13 ? minimumY - 2 : y - 7,
    maxY: maximumY - minimumY < 13 ? maximumY + 2 : y + 7,
    panning: maximumX - minimumX >= 13 || maximumY - minimumY >= 13,
  };
});
const columns = computed(() => bounds.value.maxX - bounds.value.minX + 1);
const rows = computed(() => bounds.value.maxY - bounds.value.minY + 1);
const visibleCells = computed(() => {
  const result: { x: number; y: number; state: string }[] = [];
  for (let y = bounds.value.minY; y <= bounds.value.maxY; y++) for (let x = bounds.value.minX; x <= bounds.value.maxX; x++) {
    result.push({ x, y, state: cellStates.value.get(`${x}:${y}`) ?? 'closed' });
  }
  return result;
});
const visibleNodes = computed(() => nodes.value.filter(node => {
  const points = node.footprint ?? [node.coordinates];
  const xs = points.map(point => point.x), ys = points.map(point => point.y);
  return Math.min(...xs) <= bounds.value.maxX + 1 && Math.max(...xs) >= bounds.value.minX
    && Math.min(...ys) <= bounds.value.maxY + 1 && Math.max(...ys) >= bounds.value.minY;
}));
const shape = (node: WorldNode) => (node.footprint ?? [
  { x: node.coordinates.x, y: node.coordinates.y }, { x: node.coordinates.x + 1, y: node.coordinates.y },
  { x: node.coordinates.x + 1, y: node.coordinates.y + 1 }, { x: node.coordinates.x, y: node.coordinates.y + 1 },
]).map(point => `${(point.x - bounds.value.minX) * cellSize},${(point.y - bounds.value.minY) * cellSize}`).join(' ');
const position = (x: number, y: number) => ({ left: `${(x - bounds.value.minX) * cellSize}px`, top: `${(y - bounds.value.minY) * cellSize}px` });
function selectNode(node: WorldNode) { selectedNodeId.value = node.id; selectedCell.value = null; quote.value = null; error.value = ''; }
function selectCell(x: number, y: number) { selectedNodeId.value = null; selectedCell.value = { x, y }; quote.value = null; error.value = ''; }
function pan(x: number, y: number) {
  center.value = { x: (center.value?.x ?? Math.floor((bounds.value.minX + bounds.value.maxX) / 2)) + x,
    y: (center.value?.y ?? Math.floor((bounds.value.minY + bounds.value.maxY) / 2)) + y };
}
function focusNext() {
  if (!nodes.value.length) return;
  const current = selectedNodeId.value === null ? -1 : nodes.value.findIndex(node => node.id === selectedNodeId.value);
  const next = nodes.value[(current + 1) % nodes.value.length];
  center.value = { ...next.coordinates }; selectNode(next);
}
async function preview(action: 'explore' | 'buy') {
  if (!selectedCell.value || calculating.value || props.command.busy.value || props.command.pending.value) return;
  const current = ++generation; calculating.value = true; quote.value = null; error.value = '';
  const input = { ...selectedCell.value, top_up: topUp.value };
  try { const value = await previewMapCell(props.node.id, action, input.x, input.y, input.top_up);
    if (current === generation) quote.value = { action, input, value }; }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) calculating.value = false; }
}
async function confirm() {
  if (!quote.value) return;
  const current = quote.value;
  quote.value = null;
  await props.command.submit(`/nodes/${props.node.id}/map-${current.action}`, current.input, current.value);
}
watch(() => props.node.id, () => { generation++; center.value = null; selectedNodeId.value = null; selectedCell.value = null; quote.value = null; }, { flush: 'sync' });
watch(() => props.map, () => { generation++; quote.value = null; }, { flush: 'sync' });
watch(topUp, () => { quote.value = null; });
onScopeDispose(() => { generation++; });
</script>

<template lang="pug">
.world-map-layout
  .world-map-main
    .world-map-controls(v-if="bounds.panning")
      span Координаты: X {{ bounds.minX }}…{{ bounds.maxX }}, Y {{ bounds.minY }}…{{ bounds.maxY }}
      .world-map-pan
        n-button(v-if="nodes.length" size="tiny" @click="focusNext") Следующий объект
        n-button(size="tiny" aria-label="Сдвинуть карту влево" @click="pan(-7, 0)") ←
        n-button(size="tiny" aria-label="Сдвинуть карту вверх" @click="pan(0, -7)") ↑
        n-button(size="tiny" aria-label="Сдвинуть карту вниз" @click="pan(0, 7)") ↓
        n-button(size="tiny" aria-label="Сдвинуть карту вправо" @click="pan(7, 0)") →
    .world-map-scroll
      .world-map-board(:style="{ width: `${columns * cellSize}px`, height: `${rows * cellSize}px` }" role="group" :aria-label="`Карта: ${node.name}`")
        button.world-map-cell(v-for="cell in visibleCells" :key="`${cell.x}:${cell.y}`" type="button" :class="[`state-${cell.state}`, { selected: selectedCell?.x === cell.x && selectedCell?.y === cell.y }]" :style="position(cell.x, cell.y)" :aria-label="`Ячейка ${cell.x}, ${cell.y}: ${cell.state === 'open' ? 'открыта' : cell.state === 'discovered' ? 'исследована' : 'закрыта'}`" @click="selectCell(cell.x, cell.y)")
          span {{ cell.x }},{{ cell.y }}
        svg.world-map-shapes(:width="columns * cellSize" :height="rows * cellSize" :viewBox="`0 0 ${columns * cellSize} ${rows * cellSize}`" aria-hidden="true")
          polygon(v-for="child in visibleNodes.filter(item => item.footprint)" :key="child.id" :points="shape(child)" :class="{ selected: selectedNodeId === child.id }" @click="selectNode(child)")
        button.world-map-object(v-for="child in visibleNodes" :key="child.id" type="button" :class="{ selected: selectedNodeId === child.id }" :style="position(child.coordinates.x, child.coordinates.y)" :aria-label="`${nodeLabels[child.type]}: ${child.name}, ${child.coordinates.x}, ${child.coordinates.y}`" @click="selectNode(child)")
          font-awesome-icon(:icon="child.type === 'PLOT' && child.details.plot_kind === 'campsite' ? 'tent' : 'circle'" aria-hidden="true")
          span {{ child.name }}
    p.world-map-hint Дочерних объектов: {{ nodes.length }}. Новые ячейки закрыты; свободную ячейку можно выбрать на карте.
  aside.world-map-inspector(aria-live="polite")
    template(v-if="selectedNode")
      span.world-map-kicker {{ selectedNode.type === 'PLOT' && selectedNode.details.plot_kind === 'campsite' ? 'Стоянка' : nodeLabels[selectedNode.type] }}
      h3 {{ selectedNode.name }}
      dl
        dt Координаты
        dd {{ selectedNode.coordinates.x }}, {{ selectedNode.coordinates.y }}
        dt Статус
        dd {{ selectedNode.status }}
        dt Дочерние объекты
        dd {{ selectedNode.child_count }}
        template(v-if="selectedNode.details.population !== undefined")
          dt Жители
          dd {{ selectedNode.details.population }}
        template(v-if="selectedNode.details.condition !== undefined")
          dt Прочность
          dd {{ selectedNode.details.condition }} / {{ selectedNode.details.max_condition ?? '—' }}
      router-link.world-map-open(:to="`/world/nodes/${selectedNode.id}`") Перейти к объекту →
    template(v-else-if="selectedCell")
      span.world-map-kicker Ячейка {{ selectedCell.x }}, {{ selectedCell.y }}
      h3 {{ selectedState === 'open' ? 'Открыта' : selectedState === 'discovered' ? 'Исследована' : 'Закрыта' }}
      p(v-if="selectedState === 'open'") Здесь можно разместить объект подходящего типа.
      p(v-else-if="selectedState === 'discovered'") Для использования выкупите ячейку. Цена следующей покупки растёт пропорционально числу уже купленных ячеек.
      p(v-else) Сначала исследуйте ячейку, затем выкупите её для использования.
      p(v-if="!map?.can_expand && selectedState !== 'open'") Эти ячейки открываются через развитие объекта.
      template(v-if="map?.can_expand && writable && selectedState !== 'open'")
        n-checkbox(v-if="selectedState === 'discovered'" v-model:checked="topUp") Пополнить недостающую сумму с личного баланса
        n-button(:loading="calculating" :disabled="Boolean(command.pending.value) || command.busy.value" @click="preview(selectedState === 'closed' ? 'explore' : 'buy')") {{ selectedState === 'closed' ? 'Исследовать' : 'Рассчитать покупку' }}
        template(v-if="quote")
          p {{ quote.action === 'explore' ? 'Исследование бесплатно.' : `Стоимость: ${quote.value.terms.price} Cr; с личного баланса: ${quote.value.terms.personal_charge} Cr.` }}
          n-button(type="primary" :disabled="Boolean(command.pending.value) || command.busy.value" @click="confirm") {{ quote.action === 'explore' ? 'Подтвердить исследование' : 'Подтвердить покупку' }}
      n-alert(v-if="error" type="error" role="alert") {{ error }}
    p(v-else) Выберите дочерний объект или ячейку на карте.
</template>

<style scoped>
.world-map-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(15rem, 22rem); gap: 1rem; align-items: start; }
.world-map-main { min-width: 0; }
.world-map-controls, .world-map-pan { display: flex; align-items: center; flex-wrap: wrap; gap: .4rem; }
.world-map-controls { justify-content: space-between; margin-bottom: .5rem; color: var(--text-muted); font-size: .8rem; }
.world-map-scroll { max-height: 34rem; overflow: auto; border: 1px solid var(--border); border-radius: .65rem; background: var(--bg-base); }
.world-map-board { position: relative; }
.world-map-cell { position: absolute; width: 72px; height: 72px; padding: .2rem; border: 1px solid var(--border); color: var(--text-muted); background: repeating-linear-gradient(135deg, var(--bg-base), var(--bg-base) 8px, var(--bg-surface) 8px, var(--bg-surface) 16px); text-align: left; cursor: pointer; }
.world-map-cell span { font-size: .65rem; }
.world-map-cell.state-open { background: var(--bg-surface); }
.world-map-cell.state-discovered { background: var(--primary-soft); }
.world-map-cell.selected, .world-map-object.selected { outline: 3px solid var(--primary); outline-offset: -3px; }
.world-map-shapes { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
.world-map-shapes polygon { fill: var(--primary-soft); stroke: var(--primary); stroke-width: 2; opacity: .75; pointer-events: all; cursor: pointer; }
.world-map-shapes polygon.selected { stroke-width: 4; opacity: 1; }
.world-map-object { position: absolute; z-index: 2; display: grid; place-items: center; gap: .1rem; width: 72px; height: 72px; padding: .25rem; border: 2px solid var(--primary); border-radius: .4rem; background: var(--bg-surface); color: var(--primary); cursor: pointer; overflow: hidden; }
.world-map-object span { width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .68rem; }
.world-map-object svg { font-size: 1.1rem; }
.world-map-hint { margin: .55rem 0 0; color: var(--text-muted); font-size: .8rem; }
.world-map-inspector { display: grid; gap: .75rem; min-height: 13rem; padding: 1rem; border: 1px solid var(--border); border-radius: .65rem; background: var(--bg-surface); }
.world-map-inspector h3, .world-map-inspector p { margin: 0; }
.world-map-kicker { color: var(--primary); font-size: .75rem; font-weight: 700; text-transform: uppercase; }
.world-map-inspector dl { display: grid; grid-template-columns: 1fr auto; gap: .45rem .8rem; margin: 0; }
.world-map-inspector dt { color: var(--text-muted); }
.world-map-inspector dd { margin: 0; text-align: right; }
.world-map-open { display: block; padding: .65rem; border-radius: .4rem; background: var(--primary); color: white; text-align: center; }
@media (max-width: 760px) { .world-map-layout { grid-template-columns: 1fr; } }
</style>

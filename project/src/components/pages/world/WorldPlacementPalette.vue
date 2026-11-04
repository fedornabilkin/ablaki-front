<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSkeleton } from 'naive-ui';
import { worldActionButtonTheme } from '@/entities/world/theme';
import WorldCatalogFilters from './WorldCatalogFilters.vue';
import WorldCatalogGrid from './WorldCatalogGrid.vue';
import type { WorldNode, WorldMapData } from '@/entities/world/types';
import type { MapPoint } from '@/entities/world/coordinates';
import { selectedFreeCell } from '@/entities/world/placement';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadPlacementOptions, previewTransfer } from '@/services/api/worldStorage';
import { worldError } from '@/services/api/world';
import { useCampsiteCraft } from '@/hooks/useCampsiteCraft';
import WorldSectionHeading from './WorldSectionHeading.vue';
import WorldHelpHint from './WorldHelpHint.vue';
interface Tile { key: string; name: string; description: string; icon: string; quantity: number; price: string; availability: string; available: boolean; craft?: boolean; execute: () => Promise<void> }
const props = defineProps<{ node: WorldNode; map: WorldMapData | null; selection: MapPoint[]; session: number; revision: number; writable: boolean; command: WorldCommandRunner }>();
const tiles = shallowRef<Tile[]>([]), error = ref(''), loading = ref(false), working = ref(false);
const search = ref(''), group = ref('all'), readyOnly = ref(false), selectedKey = ref<string | null>(null);
const selectedTile = computed(() => tiles.value.find(tile => tile.key === selectedKey.value));
const groups = [
  { value: 'all', label: 'Все', icon: 'cubes' },
  { value: 'equipment', label: 'Оборудование', icon: 'industry' },
  { value: 'furnishing', label: 'Обстановка', icon: 'bed' },
  { value: 'nature', label: 'Растения', icon: 'seedling' },
];
const groupFor = (tile: Tile) => ['industry', 'hammer', 'flask', 'toolbox'].includes(tile.icon) ? 'equipment' : ['seedling', 'leaf', 'tree'].includes(tile.icon) ? 'nature' : 'furnishing';
const filteredTiles = computed(() => tiles.value.filter(tile => tile.name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()) && (group.value === 'all' || groupFor(tile) === group.value) && (!readyOnly.value || tile.available)));
let generation = 0, disposed = false;
const cell = computed(() => selectedFreeCell(props.selection, props.map));
const craftHref = useCampsiteCraft(computed(() => props.session));
const locked = computed(() => !cell.value || !props.writable || !props.node.owned_by_me || props.node.status !== 'active' || loading.value || working.value || props.command.busy.value || !!props.command.pending.value);
async function load() {
  clearTimeout(selectionTimer);
  const current = ++generation, node = props.node, result: Tile[] = [];
  error.value = ''; loading.value = true;
  const valid = () => !disposed && current === generation;
  const canSubmit = () => valid() && props.writable;
  const loaders: Promise<void>[] = [loadPlacementOptions(node.id, cell.value).then(items => {
    for (const item of items) result.push({ key: `${item.requires_crafting ? 'furnishing' : 'item'}:${item.id}`, name: item.name, description: item.description, icon: item.icon, quantity: item.quantity, price: '', craft: item.requires_crafting, available: item.available, availability: item.unavailable_reason || (!node.owned_by_me ? 'Требуются права владельца' : node.status !== 'active' ? 'Сначала завершите строительство' : item.requires_crafting ? 'Сначала изготовьте предмет' : item.available ? `В наличии: ${item.quantity}` : 'Нет подходящего свободного места'), execute: async () => {
      if (!item.input) return; const quote = await previewTransfer(item.input);
      if (canSubmit()) await props.command.submit('/storage/transfer', { ...item.input }, quote);
    } });
  })];
  const responses = await Promise.allSettled(loaders);
  if (!valid()) return;
  tiles.value = result; loading.value = false;
  if (responses.some(r => r.status === 'rejected')) error.value = 'Часть вариантов размещения не загрузилась.';
}
async function act(tile: Tile) {
  if (locked.value || !tile.available) return;
  const current = generation; working.value = true; error.value = '';
  try { await tile.execute(); if (!disposed && current === generation && !props.command.pending.value && !props.command.error.value) await load(); }
  catch (cause) { if (!disposed && current === generation) error.value = cause instanceof Error && cause.message === 'price-changed' ? 'Цена изменилась. Проверьте предложение заново.' : worldError(cause); }
  finally { if (!disposed) working.value = false; }
}
watch([() => props.node.id, () => props.session], () => { tiles.value = []; selectedKey.value = null; search.value = ''; group.value = 'all'; readyOnly.value = false; }, { flush: 'sync' });
let selectionTimer: ReturnType<typeof setTimeout> | undefined;
watch([() => props.node.id, () => props.session, () => cell.value?.x, () => cell.value?.y], () => {
  clearTimeout(selectionTimer); generation++; loading.value = true;
  selectionTimer = setTimeout(() => { void load(); }, 120);
}, { immediate: true });
watch(() => props.revision, () => { if (!working.value) void load(); });
onScopeDispose(() => { disposed = true; generation++; clearTimeout(selectionTimer); });
</script>
<template lang="pug">
section.placement-palette(aria-label="Каталог предметов")
  world-section-heading(title="Предметы" icon="cubes" level="h3")
  n-alert(closable v-if="error" type="error") {{ error }}
  .placement-choice(v-if="selectedTile" aria-live="polite")
    strong
      font-awesome-icon(:icon="selectedTile.icon || 'cube'" aria-hidden="true")
      |  {{ selectedTile.name }}
    p {{ !cell ? 'Выберите свободную ячейку на карте.' : selectedTile.availability }}
    n-button(:theme-overrides="worldActionButtonTheme" :disabled="locked || !selectedTile.available" :loading="working" @click="act(selectedTile)")
      template(#icon)
        font-awesome-icon(icon="plus" aria-hidden="true")
      | Разместить
  world-catalog-filters(v-model:search="search" v-model:group="group" v-model:ready="readyOnly" :groups="groups" :count="filteredTiles.length" :total="tiles.length")
  world-catalog-grid.placement-tiles(label="Предметы" v-if="loading && !tiles.length" role="status" aria-label="Загрузка плиток")
    n-skeleton(v-for="index in 6" :key="index" height="120px" :sharp="false")
  world-catalog-grid.placement-tiles(label="Предметы" v-else)
    .placement-tile-wrap.catalog-tile-wrap(v-for="tile in filteredTiles" :key="tile.key")
      .tile-information
        world-help-hint(:label="`Описание: ${tile.name}`" symbol="i")
          p {{ tile.description || tile.name }}
          p {{ tile.availability }}
      button.placement-tile.catalog-tile(type="button" :class="{ selected: selectedKey === tile.key, unavailable: !tile.available, ready: tile.available && node.owned_by_me && writable && node.status === 'active' }" :aria-pressed="selectedKey === tile.key" :disabled="working || command.busy.value || !!command.pending.value || loading" @click="selectedKey = tile.key")
        font-awesome-icon(:icon="tile.icon || 'cube'" aria-hidden="true")
        strong {{ tile.name }}
        span ×{{ tile.quantity }}
        small(v-if="tile.price") {{ tile.price }}
  p.palette-empty(v-if="!loading && !filteredTiles.length") По этим фильтрам предметов нет.
  router-link.placement-craft(:to="craftHref")
    font-awesome-icon(icon="hammer" aria-hidden="true")
    |  Изготовление на стоянке
</template>
<style scoped>
.placement-palette { display: grid; gap: .75rem; min-width: 0; }
.tile-information { position: absolute; right: .1rem; top: .1rem; z-index: 1; }
.placement-choice { display: grid; gap: .6rem; padding-bottom: .75rem; border-bottom: 1px solid var(--border); font-size: .875rem; }
.placement-choice p { margin: 0; color: var(--text-muted); font-size: .8125rem; }
.placement-choice > .n-button { justify-self: start; }
.placement-craft { display: inline-flex; align-items: center; gap: .5rem; justify-self: start; min-height: 2.75rem; padding: .5rem 0; font-size: .8125rem; }
.palette-empty { margin: 0; color: var(--text-muted); font-size: .8125rem; }
</style>

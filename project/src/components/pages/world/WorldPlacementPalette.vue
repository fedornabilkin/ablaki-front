<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NSkeleton } from 'naive-ui';
import type { WorldNode, WorldMapData } from '@/entities/world/types';
import type { MapPoint } from '@/entities/world/coordinates';
import { selectedFreeCell } from '@/entities/world/placement';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadPlacementOptions, previewTransfer } from '@/services/api/worldStorage';
import { worldError } from '@/services/api/world';
import { useCampsiteCraft } from '@/hooks/useCampsiteCraft';
import WorldHelpHint from './WorldHelpHint.vue';
interface Tile { key: string; name: string; description: string; icon: string; price: string; availability: string; available: boolean; craft?: boolean; execute: () => Promise<void> }
const props = defineProps<{ node: WorldNode; map: WorldMapData | null; selection: MapPoint[]; session: number; revision: number; writable: boolean; command: WorldCommandRunner }>();
const tiles = shallowRef<Tile[]>([]), error = ref(''), loading = ref(false), working = ref(false);
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
    for (const item of items) result.push({ key: `${item.requires_crafting ? 'furnishing' : 'item'}:${item.id}`, name: item.name, description: item.description, icon: item.icon, price: '', craft: item.requires_crafting, available: item.available, availability: !node.owned_by_me ? 'Требуются права владельца' : node.status !== 'active' ? 'Сначала завершите строительство' : item.requires_crafting ? 'Сначала изготовьте предмет' : item.available ? `В наличии: ${item.quantity}` : 'Нет подходящего свободного места', execute: async () => {
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
watch([() => props.node.id, () => props.session], () => { tiles.value = []; }, { flush: 'sync' });
let selectionTimer: ReturnType<typeof setTimeout> | undefined;
watch([() => props.node.id, () => props.session, () => cell.value?.x, () => cell.value?.y], () => {
  clearTimeout(selectionTimer); generation++; loading.value = true;
  selectionTimer = setTimeout(() => { void load(); }, 120);
}, { immediate: true });
watch(() => props.revision, () => { if (!working.value) void load(); });
onScopeDispose(() => { disposed = true; generation++; clearTimeout(selectionTimer); });
</script>
<template lang="pug">
section.placement-palette(v-if="loading || tiles.length || error" aria-label="Доступно для размещения")
  h3 Можно разместить здесь
  n-alert(closable v-if="error" type="error") {{ error }}
  .placement-tiles(v-if="loading && !tiles.length" role="status" aria-label="Загрузка плиток")
    n-skeleton(v-for="index in 6" :key="index" height="120px" :sharp="false")
  .placement-tiles(v-else)
    .placement-tile-wrap(v-for="tile in tiles" :key="tile.key")
      .tile-information
        world-help-hint(:label="`Описание: ${tile.name}`" symbol="i")
          p {{ tile.description || tile.name }}
          p {{ tile.availability }}
      button.placement-tile(type="button" :disabled="locked || !tile.available" @click="act(tile)")
        font-awesome-icon(:icon="tile.icon || 'cube'" aria-hidden="true")
        strong {{ tile.name }}
        span {{ tile.availability }}
        small(v-if="tile.price") {{ tile.price }}
  router-link.placement-craft(:to="craftHref")
    font-awesome-icon(icon="hammer" aria-hidden="true")
    |  Изготовление на стоянке
</template>
<style scoped>
.placement-tile:not(:disabled) { border-color: var(--primary); background: var(--primary-soft); }
.placement-tile-wrap { position: relative; display: grid; }.tile-information { position: absolute; right: .4rem; top: .4rem; z-index: 1; }.placement-tile > strong { padding-right: 1.3rem; }.placement-craft { display: inline-flex; align-items: center; gap: .5rem; padding: .65rem 1rem; margin-top: .85rem; border-radius: .5rem; background: var(--primary); color: var(--text-on-acc); font-weight: 650; }
.placement-palette { margin-top: 1rem; }.placement-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: .6rem; }.placement-tile { display: grid; gap: .4rem; padding: .8rem; border: 1px solid var(--border); border-radius: .5rem; color: var(--text); background: var(--bg-surface); text-align: left; cursor: pointer; }.placement-tile:disabled { opacity: .55; cursor: default; }.placement-tile svg { font-size: 1.5rem; color: var(--primary); }.placement-tile span { color: var(--text-muted); font-size: .8rem; }.placement-tile small { color: var(--primary); }
</style>

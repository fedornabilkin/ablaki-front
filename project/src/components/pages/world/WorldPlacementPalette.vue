<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert } from 'naive-ui';
import type { WorldNode } from '@/entities/world/types';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadPlacementOptions, previewTransfer } from '@/services/api/worldStorage';
import { loadPremises, previewPremises } from '@/services/api/worldPremises';
import { loadGarden, previewGarden } from '@/services/api/worldGarden';
import { loadShelter, previewShelter } from '@/services/api/worldShelter';
import { formatCredits } from '@/entities/world/credits';
import { worldError } from '@/services/api/world';
interface Tile { key: string; name: string; icon: string; price: string; availability: string; available: boolean; execute: () => Promise<void> }
const props = defineProps<{ node: WorldNode; session: number; revision: number; writable: boolean; command: WorldCommandRunner; buildOnly?: boolean }>();
const tiles = shallowRef<Tile[]>([]), error = ref(''), loading = ref(false), working = ref(false);
let generation = 0, disposed = false;
const locked = computed(() => !props.writable || loading.value || working.value || props.command.busy.value || !!props.command.pending.value);
async function load() {
  const current = ++generation, node = props.node, result: Tile[] = [];
  tiles.value = []; error.value = ''; loading.value = true;
  if (!node.owned_by_me || !['PLOT', 'ROOM'].includes(node.type) || node.details.plot_kind === 'garden') { loading.value = false; return; }
  const valid = () => !disposed && current === generation;
  const canSubmit = () => valid() && props.writable;
  const loaders: Promise<void>[] = [loadPlacementOptions(node.id).then(items => {
    for (const item of items) result.push({ key: `item:${item.id}`, name: item.name, icon: item.icon, price: 'Бесплатно', available: item.available, availability: item.available ? `В наличии: ${item.quantity}` : 'Нет подходящего свободного места', execute: async () => {
      if (!item.input) return; const quote = await previewTransfer(item.input);
      if (canSubmit()) await props.command.submit('/storage/transfer', { ...item.input }, quote);
    } });
  })];
  if (node.details.plot_kind === 'campsite' && !props.buildOnly) {
    loaders.push((async () => {
      let page = 1;
      do {
        const offers = await loadPremises(node.id, { page });
        for (const offer of offers.items) result.push({ key: `building:${offer.id}`, name: offer.name, icon: 'house', price: `${formatCredits(offer.price)} Cr`, available: offers.can_buy && offer.can_afford !== false && offer.requirements_status.allowed && !!offers.area && offers.area.available >= offer.area,
          availability: offer.can_afford === false ? 'Не хватает бюджета' : !offer.requirements_status.allowed ? 'Не выполнены условия' : !offers.area || offers.area.available < offer.area ? 'Недостаточно площади' : !offers.can_buy ? 'Покупка недоступна' : 'Можно построить', execute: async () => {
            const quote = await previewPremises(node.id, 'buy', { offer_id: offer.id });
            if (quote.room?.price !== offer.price) throw new Error('price-changed');
            if (canSubmit()) await props.command.submit(`/nodes/${node.id}/premises-buy`, quote.input, quote.quote);
          } });
        if (page * offers.pageSize >= offers.total) break;
        page++;
      } while (page <= 50 && valid());
    })());
    loaders.push(loadGarden(node.id).then(garden => {
      if (!garden.offer || garden.garden) return; const offer = garden.offer;
      result.push({ key: 'garden', name: offer.name, icon: 'seedling', price: `${formatCredits(offer.price)} Cr`, available: garden.can_buy && offer.can_afford !== false, availability: offer.can_afford === false ? 'Не хватает бюджета' : !garden.can_buy ? 'Покупка недоступна' : 'Можно купить', execute: async () => {
        const quote = await previewGarden(node.id, 'buy', { top_up: false });
        if (quote.payment?.total !== offer.price) throw new Error('price-changed');
        if (canSubmit()) await props.command.submit(`/nodes/${node.id}/garden-buy`, quote.input, quote.quote);
      } });
    }));
    loaders.push(loadShelter(node.id).then(shelter => {
      if (shelter.deployment) return;
      result.push({ key: 'shelter', name: 'Шалаш', icon: 'tent', price: 'Бесплатно', available: shelter.writable && (!shelter.claimed || (shelter.durability ?? 0) > 0), availability: shelter.claimed ? 'Есть в инвентаре' : 'Стартовый шалаш', execute: async () => {
        const action = shelter.claimed ? 'deploy' : 'claim';
        const quote = await previewShelter(node.id, action, { direct_deploy: action === 'claim', end_lodging: false });
        if (canSubmit()) await props.command.submit(`/nodes/${node.id}/shelter-${action}`, quote.input, quote.quote);
      } });
    }));
  }
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
watch([() => props.node.id, () => props.session], load, { immediate: true });
watch(() => props.revision, () => { if (!working.value) void load(); });
onScopeDispose(() => { disposed = true; generation++; });
</script>
<template lang="pug">
section.placement-palette(v-if="tiles.length || error || (buildOnly && node.owned_by_me && ['PLOT', 'BUILDING', 'ROOM', 'CHEST'].includes(node.type))" aria-label="Доступно для размещения")
  h3 Можно разместить здесь
  router-link(v-if="buildOnly" :to="{ path: `/world/nodes/${node.id}`, hash: '#development' }") Построить объект
  n-alert(v-if="error" type="error") {{ error }}
  .placement-tiles
    button.placement-tile(v-for="tile in tiles" :key="tile.key" type="button" :disabled="locked || !tile.available" @click="act(tile)")
      font-awesome-icon(:icon="tile.icon || 'cube'" aria-hidden="true")
      strong {{ tile.name }}
      span {{ tile.availability }}
      small {{ tile.price }}
</template>
<style scoped>
.placement-palette { margin-top: 1rem; }.placement-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: .6rem; }.placement-tile { display: grid; gap: .4rem; padding: .8rem; border: 1px solid var(--border); border-radius: .5rem; color: var(--text); background: var(--bg-surface); text-align: left; cursor: pointer; }.placement-tile:disabled { opacity: .55; cursor: default; }.placement-tile svg { font-size: 1.5rem; color: var(--primary); }.placement-tile span { color: var(--text-muted); font-size: .8rem; }.placement-tile small { color: var(--primary); }
</style>

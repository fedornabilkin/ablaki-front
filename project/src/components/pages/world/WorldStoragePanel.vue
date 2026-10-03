<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { NAlert, NButton, NInputNumber, NSelect } from 'naive-ui';
import PagePager from '@/components/PagePager.vue';
import { loadStorage, loadStorageList, previewTransfer, type StorageHeader, type StorageView, type TransferInput } from '@/services/api/worldStorage';
import { worldError } from '@/services/api/world';
import type { WorldQuote } from '@/entities/world/types';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import WorldChestRepair from './WorldChestRepair.vue';
const props = defineProps<{ nodeId: number | null; storageId?: number; session: number; writable: boolean; command: WorldCommandRunner }>();
const route = useRoute(), headers = shallowRef<StorageHeader[]>([]), view = shallowRef<StorageView | null>(null), loading = ref(false), error = ref('');
const selected = ref<number | null>(null), destination = ref<number | null>(null), position = ref<number | null>(1), quantity = ref<number | null>(1), instance = ref<number | null>(null), quote = shallowRef<WorldQuote | null>(null), previewing = ref(false);
const { busy, pending } = props.command;
let generation = 0, previewGeneration = 0, disposed = false;
const page = computed(() => { const value = Number(route.query.storage_page || 1); return Number.isSafeInteger(value) && value > 0 && value <= 1000000 ? value : 1; });
const item = computed(() => view.value?.items.find(row => row.id === selected.value));
const target = computed(() => headers.value.find(row => row.id === destination.value));
const canWrite = computed(() => props.writable && Boolean(view.value?.writable));
const destinationOptions = computed(() => headers.value.filter(row => row.kind !== 'recovery').map(row => ({ label: `${row.name} · №${row.id}`, value: row.id })));
const unitOptions = computed(() => item.value?.instances.map(unit => ({ label: `№${unit.id} · ${unit.durability}/${unit.max_durability}`, value: unit.id })) || []);
const payload = computed<TransferInput | null>(() => view.value && item.value && destination.value && position.value && quantity.value ? ({ inventory_id: item.value.id, source_storage_id: view.value.storage.id, destination_storage_id: destination.value, position: position.value, quantity: quantity.value, instance_id: instance.value }) : null);
const pager = computed(() => view.value ? { ...view.value, items: view.value.items.map(item => ({ ...item })) } : { items: [], total: 0, pageSize: 100 });
const cells = computed(() => {
  if (!view.value) return [];
  const items = new Map(view.value.items.map(item => [item.position, item]));
  const size = Math.min(1000, Math.max(view.value.storage.capacity, ...view.value.items.map(item => item.position)));
  return Array.from({ length: size }, (_, i) => ({ position: i + 1, item: items.get(i + 1) }));
});
const placeNames: Record<string, string> = { outdoor: 'На улице', covered: 'Под навесом', indoor: 'В помещении', carried: 'В инвентаре' };
function link(id: number) { return { path: `/world/storage/${id}`, query: props.nodeId === null ? {} : { node_id: props.nodeId } }; }
async function load() {
  const current = ++generation; previewGeneration++; view.value = null; headers.value = []; selected.value = null; quote.value = null; error.value = ''; loading.value = true;
  try {
    const list = await loadStorageList(props.nodeId);
    if (disposed || current !== generation) return;
    const id = props.storageId ?? list.find(row => row.kind === 'stockpile' && row.node_id === props.nodeId)?.id ?? list.find(row => row.kind === 'placement')?.id ?? list[0]?.id;
    if (!id) { headers.value = list; return; }
    const result = await loadStorage(id, page.value);
    if (result.storage.kind === 'stockpile') {
      const first = result.currentPage === 1 ? result : await loadStorage(id, 1);
      const pages = await Promise.all(Array.from({ length: Math.max(0, first.pageCount - 1) }, (_, i) => loadStorage(id, i + 2)));
      if (pages.some(p => p.storage.revision !== first.storage.revision)) throw new Error('storage-changed');
      Object.assign(result, first, { items: [...first.items, ...pages.flatMap(p => p.items)] });
    }
    if (disposed || current !== generation) return;
    headers.value = list.some(row => row.id === id) ? list : [...list, result.storage]; view.value = result;
  } catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.storageId, () => props.session, page], load, { immediate: true });
watch([selected, destination, position, quantity, instance], () => { previewGeneration++; quote.value = null; previewing.value = false; });
watch(selected, () => { instance.value = null; quantity.value = 1; });
watch(target, value => { if (value?.kind === 'placement') quantity.value = 1; position.value = 1; });
async function preview() {
  if (!payload.value || busy.value || pending.value || !canWrite.value) return;
  const current = ++previewGeneration; previewing.value = true; error.value = '';
  try { const result = await previewTransfer(payload.value); if (!disposed && current === previewGeneration) quote.value = result; }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) previewing.value = false; }
}
async function confirm() { if (quote.value && payload.value) { await props.command.submit('/storage/transfer', { ...payload.value }, quote.value); if (!disposed && !pending.value) void load(); } }
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.world-storage(aria-label="Вещи и размещение")
  h2 Вещи и размещение
  n-button(size="small" :loading="loading" @click="load") Обновить хранилище
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  p(v-if="loading") Загружаем хранилище…
  nav.storage-links(aria-label="Хранилища")
    router-link(v-for="header in headers" :key="header.id" :to="link(header.id)" :aria-current="header.id === view?.storage.id ? 'page' : undefined") {{ header.name }} · №{{ header.id }}
  template(v-if="view")
    h3 {{ view.storage.name }} · Доступно мест: {{ view.storage.capacity }}
    router-link(v-if="view.location" :to="`/world/nodes/${view.location.node_id}`") Место: {{ view.location.name }}
    p(v-if="view.container") Прочность сундука: {{ view.container.durability }} / {{ view.container.max_durability }}
    world-chest-repair(v-if="view.storage.kind === 'chest'" :storage="view.storage" :command="command" :writable="canWrite" :session="session")
    p(v-if="view.storage.kind === 'placement'") Станции на улице быстрее изнашиваются. Защиту дают подходящие помещения и навесы.
    ul.placement-slots(v-if="view.slots.length")
      li(v-for="slot in view.slots" :key="slot.position") Место {{ slot.position }} · {{ placeNames[slot.exposure_class] }} · {{ slot.available ? 'Доступно' : 'Закрыто' }}
    p(v-if="!view.items.length") Здесь пока нет вещей.
    .warehouse-items(v-if="view.storage.kind === 'stockpile'" aria-label="Ячейки склада")
      button.warehouse-cell(v-for="cell in cells" :key="cell.position" type="button" :class="{ selected: cell.item?.id === selected, empty: !cell.item }" :disabled="!cell.item" :aria-label="cell.item ? `${cell.item.name}, ${cell.item.quantity} шт., ячейка ${cell.position}` : `Пустая ячейка ${cell.position}`" @click="selected = cell.item?.id ?? null")
        template(v-if="cell.item")
          font-awesome-icon.cell-icon(:icon="cell.item.icon || 'fa fa-cube'")
          strong.cell-quantity {{ cell.item.quantity }}
          span.cell-name {{ cell.item.name }}
        small(v-else) {{ cell.position }}
    ul.storage-items(v-else)
      li(v-for="row in view.items" :key="row.id" :class="{selected: selected === row.id}")
        .item-summary
          span {{ row.name }}
          strong × {{ row.quantity }}
        small Место {{ row.position }}
        small(v-if="row.position > view.storage.capacity") Переполнение — предмет можно забрать
        router-link(v-for="unit in row.instances" :key="unit.id" :to="`/world/equipment/${unit.id}/wear`") №{{ unit.id }} · {{ unit.durability }}/{{ unit.max_durability }} · {{ placeNames[unit.exposure_class] }} · история прочности
        router-link(v-if="row.inner_storage_id" :to="link(row.inner_storage_id)") Открыть сундук
        n-button(size="small" :disabled="busy || Boolean(pending) || !canWrite" @click="selected = row.id") Выбрать для переноса
    page-pager(v-if="view.storage.kind !== 'stockpile'" :page="page" :result="pager" query-prefix="storage" :disabled="loading")
  form.transfer-form(v-if="item" @submit.prevent="preview")
    h3 Переместить: {{ item.name }}
    n-select(v-model:value="destination" :options="destinationOptions" :disabled="busy" placeholder="Куда переместить" aria-label="Целевое хранилище")
    n-input-number(v-model:value="position" :min="1" :max="target?.capacity || 1" :precision="0" :disabled="busy" aria-label="Номер места")
    n-input-number(v-model:value="quantity" :min="1" :max="target?.kind === 'placement' || instance ? 1 : item.quantity" :precision="0" :disabled="busy" aria-label="Количество")
    n-select(v-if="unitOptions.length" v-model:value="instance" :options="unitOptions" clearable :disabled="busy || quantity !== 1" placeholder="Экземпляр: автоматически" aria-label="Экземпляр оборудования")
    n-button(attr-type="submit" :loading="previewing" :disabled="!payload || busy || Boolean(pending) || !canWrite") Подготовить перенос
    template(v-if="quote")
      p Переместить {{ quantity }} шт. в «{{ target?.name }}», место {{ position }}?
      n-button(type="primary" :loading="busy" :disabled="Boolean(pending) || !canWrite" @click="confirm") Подтвердить перенос
</template>
<style scoped>
.warehouse-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: .5rem; }
.warehouse-cell { min-height: 84px; position: relative; padding: .5rem; color: var(--text); background: var(--bg-surface); border: 1px solid var(--border); border-radius: .5rem; cursor: pointer; }
.warehouse-cell.selected { outline: 2px solid var(--primary); }
.warehouse-cell.empty { opacity: .45; cursor: default; }
.cell-icon { position: absolute; top: .6rem; left: .6rem; font-size: 1.25rem; }
.cell-quantity { position: absolute; top: .5rem; right: .5rem; font-size: .85rem; }
.cell-name { display: block; margin-top: 2rem; font-size: .75rem; line-height: 1.2; overflow-wrap: anywhere; }
.world-storage, .transfer-form { display: grid; gap: .75rem; }
.storage-links { display: flex; flex-wrap: wrap; gap: .75rem; }
.storage-items { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); gap: .5rem; }
.storage-items li { border: 1px solid var(--border); border-radius: .4rem; padding: .75rem; display: grid; gap: .4rem; }
.storage-items li.selected { outline: 2px solid var(--primary); }
.item-summary { display: flex; justify-content: space-between; gap: .5rem; }
.transfer-form { max-width: 32rem; }
</style>

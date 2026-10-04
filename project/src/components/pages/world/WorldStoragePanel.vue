<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NInputNumber, NSelect } from 'naive-ui';
import { loadStorageContents, loadStorageList, previewTransfer, type StorageHeader, type StorageView } from '@/services/api/worldStorage';
import { storageTransfer } from '@/entities/world/storageInteraction';
import { worldError } from '@/services/api/world';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import WorldChestRepair from './WorldChestRepair.vue';
import WorldStorageGrid from './WorldStorageGrid.vue';

const props = defineProps<{ nodeId: number | null; storageId?: number; session: number; writable: boolean; command: WorldCommandRunner }>();
const headers = shallowRef<StorageHeader[]>([]), view = shallowRef<StorageView | null>(null), targetView = shallowRef<StorageView | null>(null);
const destination = ref<number | null>(null), selected = ref<number | null>(null), quantity = ref<number | null>(1), instance = ref<number | null>(null);
const loading = ref(false), targetLoading = ref(false), transferring = ref(false), error = ref(''), notice = ref('');
const drag = ref<{ pointer: number; x: number; y: number; moved: boolean; item: number } | null>(null), hover = ref<string | null>(null);
let generation = 0, targetGeneration = 0, operation = 0, disposed = false, suppressClick = false;
const { busy, pending } = props.command;
const blocked = computed(() => loading.value || transferring.value || busy.value || !!pending.value);
const source = computed(() => [view.value, targetView.value].find(value => value?.items.some(item => item.id === selected.value)) ?? null);
const item = computed(() => source.value?.items.find(item => item.id === selected.value));
const destinationOptions = computed(() => headers.value.filter(header => header.kind !== 'recovery' && header.id !== view.value?.storage.id).map(header => ({ label: header.name, value: header.id })));
const panes = computed(() => [view.value, targetView.value].filter((value): value is StorageView => !!value));
const unitOptions = computed(() => item.value?.instances.map(unit => ({ label: `Прочность ${unit.durability}/${unit.max_durability} · №${unit.id}`, value: unit.id })) ?? []);
function link(id: number) { return { path: `/world/storage/${id}`, query: props.nodeId === null ? {} : { node_id: props.nodeId } }; }
function input(target: StorageView, position: number) {
  if (!props.writable || !source.value || !item.value) return null;
  return storageTransfer(source.value, item.value, target, position, target.storage.kind === 'placement' ? 1 : quantity.value ?? 0, instance.value);
}
function destinations(target: StorageView) {
  if (blocked.value) return [];
  return Array.from({ length: target.storage.capacity }, (_, index) => index + 1).filter(position => input(target, position));
}
async function loadTarget() {
  const current = ++targetGeneration, id = destination.value;
  targetView.value = null; targetLoading.value = false; cancelDrag();
  if (!id || id === view.value?.storage.id) return;
  targetLoading.value = true;
  try { const result = await loadStorageContents(id); if (!disposed && current === targetGeneration) targetView.value = result; }
  catch (cause) { if (!disposed && current === targetGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === targetGeneration) targetLoading.value = false; }
}
async function load() {
  const current = ++generation; operation++; targetGeneration++; cancelDrag();
  loading.value = true; transferring.value = false; view.value = null; targetView.value = null; headers.value = []; selected.value = null; error.value = '';
  try {
    const list = await loadStorageList(props.nodeId);
    if (disposed || current !== generation) return;
    const id = props.storageId ?? list.find(row => row.kind === 'stockpile' && row.node_id === props.nodeId)?.id ?? list.find(row => row.kind === 'placement')?.id ?? list[0]?.id;
    headers.value = list;
    if (!id) return;
    const result = await loadStorageContents(id);
    if (disposed || current !== generation) return;
    view.value = result;
    if (!list.some(header => header.id === id)) headers.value = [...list, result.storage];
    const next = destinationOptions.value.some(option => option.value === destination.value) ? destination.value : destinationOptions.value[0]?.value ?? null;
    if (next === destination.value) void loadTarget(); else destination.value = next;
  } catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
function select(target: StorageView, position: number) {
  const row = target.items.find(item => item.position === position);
  if (!row) return;
  selected.value = row.id; quantity.value = Math.min(row.quantity, 10000); instance.value = null; notice.value = ''; error.value = '';
}
function choose(target: StorageView, position: number) {
  if (suppressClick) { suppressClick = false; return; }
  if (blocked.value) return;
  if (input(target, position)) void transfer(target, position);
  else select(target, position);
}
async function transfer(target: StorageView, position: number) {
  const payload = input(target, position);
  if (blocked.value || !payload) return;
  const current = ++operation; transferring.value = true; error.value = ''; notice.value = ''; cancelDrag();
  try {
    const quote = await previewTransfer(payload);
    if (disposed || current !== operation || !props.writable) return;
    await props.command.submit('/storage/transfer', { ...payload }, quote);
    if (!disposed && current === operation && !pending.value && !props.command.error.value) { notice.value = 'Предметы перемещены.'; void load(); }
  } catch (cause) { if (!disposed && current === operation) error.value = worldError(cause); }
  finally { if (!disposed && current === operation) transferring.value = false; }
}
function down(event: PointerEvent, target: StorageView | null, position: number) {
  suppressClick = false;
  if (!target) return;
  const row = target.items.find(item => item.position === position);
  if (event.button !== 0 || event.pointerType === 'touch' || blocked.value || !props.writable || !target.writable || !row) return;
  // Keep the chosen stack until an actual drag starts: a tap on a matching stack is a destination.
  drag.value = { pointer: event.pointerId, x: event.clientX, y: event.clientY, moved: false, item: row.id };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}
function move(event: PointerEvent) {
  if (!drag.value || drag.value.pointer !== event.pointerId) return;
  if (!drag.value.moved && Math.hypot(event.clientX - drag.value.x, event.clientY - drag.value.y) > 7) {
    const pane = panes.value.find(value => value.items.some(item => item.id === drag.value!.item));
    const row = pane?.items.find(item => item.id === drag.value!.item);
    if (pane && row && selected.value !== row.id) select(pane, row.position);
    drag.value.moved = true;
  }
  const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-storage][data-position]');
  hover.value = drag.value.moved && cell?.dataset.drop === 'true' ? `${cell.dataset.storage}:${cell.dataset.position}` : null;
}
function up(event: PointerEvent) {
  if (!drag.value || drag.value.pointer !== event.pointerId) return;
  move(event);
  const moved = drag.value.moved, target = hover.value;
  cancelDrag(); suppressClick = moved;
  if (!moved || !target) return;
  const [storage, position] = target.split(':').map(Number), pane = panes.value.find(value => value.storage.id === storage);
  if (pane) void transfer(pane, position);
}
function cancelDrag() { drag.value = null; hover.value = null; }
watch(destination, loadTarget);
watch([() => props.nodeId, () => props.storageId, () => props.session], () => { destination.value = null; notice.value = ''; void load(); }, { immediate: true, flush: 'sync' });
watch(() => props.writable, () => { operation++; transferring.value = false; cancelDrag(); }, { flush: 'sync' });
onScopeDispose(() => { disposed = true; generation++; targetGeneration++; operation++; });
</script>
<template lang="pug">
section.world-storage(aria-label="Вещи и размещение" @keydown.esc="selected = null; cancelDrag()")
  .storage-heading
    h2 Вещи и размещение
    n-button(size="small" :loading="loading" :disabled="blocked" @click="load") Обновить
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  p(v-if="notice" role="status") {{ notice }}
  p.storage-hint Перетащите вещь в свободную ячейку или на такую же стопку. Можно нажать на предмет, затем на подсвеченное место. Перенос — бесплатно; помещение в сундук расходует его прочность.
  nav.storage-links(aria-label="Хранилища")
    router-link(v-for="header in headers" :key="header.id" :to="link(header.id)" :aria-current="header.id === view?.storage.id ? 'page' : undefined") {{ header.name }}
  p(v-if="loading" role="status") Загружаем вещи…
  .transfer-controls(v-if="item")
    strong {{ item.name }}
    label Количество
      n-input-number(v-model:value="quantity" :min="1" :max="Math.min(item.quantity, 10000)" :precision="0" :disabled="blocked || !!instance")
    n-button(size="small" :disabled="blocked || !!instance" @click="quantity = Math.min(item.quantity, 10000)") Вся стопка
    n-button(size="small" :disabled="blocked" @click="selected = null") Снять выбор
    small Для размещения станции или сундука переносится 1 шт.
    n-select(v-if="unitOptions.length" v-model:value="instance" :options="unitOptions" clearable :disabled="blocked || quantity !== 1" placeholder="Экземпляр: автоматически" aria-label="Экземпляр оборудования")
    router-link(v-if="item.inner_storage_id" :to="link(item.inner_storage_id)") Открыть сундук
    router-link(v-for="unit in item.instances" :key="unit.id" :to="`/world/equipment/${unit.id}/wear`") Прочность {{ unit.durability }}/{{ unit.max_durability }} · история
  .storage-panes(v-if="view")
    section.storage-pane
      h3 {{ view.storage.name }}
      small {{ view.items.length }} / {{ view.storage.capacity }} мест занято
      p(v-if="!props.writable || !view.writable") Только просмотр
      world-storage-grid(:view="view" :selected="selected" :blocked="blocked" :dragging="drag?.moved ? drag.item : null" :target="hover" :destinations="destinations(view)" @choose="choose(view, $event)" @down="(event, position) => down(event, view, position)" @move="move" @up="up" @cancel="cancelDrag")
      world-chest-repair(v-if="view.storage.kind === 'chest'" :storage="view.storage" :command="command" :writable="props.writable && view.writable" :session="session")
    section.storage-pane(v-if="destinationOptions.length")
      label Второе хранилище
        n-select(v-model:value="destination" :options="destinationOptions" :disabled="blocked" aria-label="Второе хранилище")
      p(v-if="targetLoading" role="status") Загружаем ячейки…
      template(v-else-if="targetView")
        small {{ targetView.items.length }} / {{ targetView.storage.capacity }} мест занято
        p(v-if="!props.writable || !targetView.writable") Только просмотр
        world-storage-grid(:view="targetView" :selected="selected" :blocked="blocked" :dragging="drag?.moved ? drag.item : null" :target="hover" :destinations="destinations(targetView)" @choose="choose(targetView, $event)" @down="(event, position) => down(event, targetView, position)" @move="move" @up="up" @cancel="cancelDrag")
  p(v-if="!loading && !view && !error") Доступных хранилищ пока нет.
</template>
<style scoped>
.world-storage { display: grid; gap: .75rem; min-width: 0; }.storage-heading { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }.storage-heading h2 { margin: 0; }.storage-hint { margin: 0; color: var(--text-muted); font-size: .85rem; }
.storage-links, .transfer-controls { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; }.storage-links a { padding: .4rem .6rem; border: 1px solid var(--border); border-radius: .4rem; }.storage-links a[aria-current] { background: var(--primary-soft); }
.storage-panes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }.storage-pane { display: grid; align-content: start; gap: .6rem; min-width: 0; padding: .75rem; border: 1px solid var(--border); border-radius: .6rem; }.storage-pane h3 { margin: 0; }.storage-pane label { display: grid; gap: .35rem; }
.transfer-controls { padding: .75rem; border: 1px solid var(--primary); border-radius: .5rem; background: var(--primary-soft); }.transfer-controls label { max-width: 9rem; }.transfer-controls > small { flex-basis: 100%; }
@media(max-width: 700px) { .storage-panes { grid-template-columns: 1fr; } }
</style>

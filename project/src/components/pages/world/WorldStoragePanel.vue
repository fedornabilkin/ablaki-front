<script setup lang="ts">
import { worldActionButtonTheme, worldNeutralButtonTheme } from '@/entities/world/theme';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NInputNumber, NPopover, NSelect, NSkeleton } from 'naive-ui';
import { loadStorageContents, loadStorageList, previewTransfer, type StorageHeader, type StorageView } from '@/services/api/worldStorage';
import { optimisticTransfer, storageTransfer, type StorageMapContext } from '@/entities/world/storageInteraction';
import { loadWorldMap, loadWorldNavigation, loadWorldScreen, worldError } from '@/services/api/world';
import type { WorldNode, WorldMapData } from '@/entities/world/types';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import WorldChestRepair from './WorldChestRepair.vue';
import WorldStorageGrid from './WorldStorageGrid.vue';
import WorldStorageExpansion from './WorldStorageExpansion.vue';

const props = defineProps<{ nodeId: number | null; node?: WorldNode; map?: WorldMapData | null; storageId?: number; session: number; revision?: number; writable: boolean; command: WorldCommandRunner }>();
const headers = shallowRef<StorageHeader[]>([]), view = shallowRef<StorageView | null>(null), targetView = shallowRef<StorageView | null>(null);
const leftContext = shallowRef<StorageMapContext | null>(null), rightContext = shallowRef<StorageMapContext | null>(null);
const destination = ref<number | null>(null), selected = ref<number | null>(null), quantity = ref<number | null>(1), instance = ref<number | null>(null);
const loading = ref(false), targetLoading = ref(false), transferring = ref(false), error = ref(''), notice = ref('');
const drag = ref<{ pointer: number; x: number; y: number; moved: boolean; item: number } | null>(null), hover = ref<string | null>(null);
let generation = 0, targetGeneration = 0, operation = 0, disposed = false, suppressClick = false;
const { busy, pending } = props.command;
const blocked = computed(() => loading.value || transferring.value || busy.value || !!pending.value);
const source = computed(() => [view.value, targetView.value].find(value => value?.items.some(item => item.id === selected.value)) ?? null);
const item = computed(() => source.value?.items.find(item => item.id === selected.value));
const choices = computed(() => headers.value.filter(header => header.kind !== 'recovery'));
const storagePaths = shallowRef<Record<number, WorldNode[]>>({});
const pathLoading = ref<number[]>([]), pathErrors = ref<number[]>([]);
let pathEpoch = 0;
const storageName = (header: StorageHeader) => header.kind === 'placement' ? header.name.replace(/\s*·\s*Размещение$/u, '') : header.name;
async function loadStoragePath(header: StorageHeader) {
  const id = header.node_id;
  if (!id || storagePaths.value[id] || pathLoading.value.includes(id)) return;
  const current = pathEpoch;
  pathLoading.value = [...pathLoading.value, id]; pathErrors.value = pathErrors.value.filter(value => value !== id);
  try {
    const result = await loadWorldNavigation(id);
    if (current !== pathEpoch || disposed) return;
    const path = [...result.breadcrumbs, result.node].filter((node, index, all) => all.findIndex(other => other.id === node.id) === index);
    storagePaths.value = { ...storagePaths.value, [id]: path };
  } catch {
    if (current === pathEpoch && !disposed) pathErrors.value = [...pathErrors.value, id];
  } finally { if (current === pathEpoch) pathLoading.value = pathLoading.value.filter(value => value !== id); }
}
function storageOptions(index: number) {
  const other = index === 0 ? destination.value : view.value?.storage.id;
  return choices.value.map(header => ({ label: header.name, value: header.id, disabled: header.id === other }));
}
function chooseStorage(index: number, id: number) {
  if (blocked.value || !storageOptions(index).some(option => option.value === id && !option.disabled)) return;
  if (index === 0) void load(id); else destination.value = id;
}
const panels = computed(() => [
  { view: view.value, loading: loading.value, context: props.map && props.node?.map && props.node.id === view.value?.storage.node_id && view.value?.storage.kind === 'placement' ? { map: props.map, bounds: props.node.map } : leftContext.value },
  { view: targetView.value, loading: targetLoading.value, context: rightContext.value },
]);
const panes = computed(() => [view.value, targetView.value].filter((value): value is StorageView => !!value));
const unitOptions = computed(() => item.value?.instances.map(unit => ({ label: `Прочность ${unit.durability}/${unit.max_durability} · №${unit.id}`, value: unit.id })) ?? []);
function link(id: number) { return { path: `/world/storage/${id}`, query: props.nodeId === null ? {} : { node_id: props.nodeId } }; }
async function readView(id: number) {
  const header = headers.value.find(row => row.id === id);
  const provided = header?.node_id === props.map?.node_id && props.node?.map ? { map: props.map!, bounds: props.node.map } : null;
  const mapRequest = header?.kind === 'placement' && header.node_id !== null && !provided ? loadWorldMap(header.node_id) : Promise.resolve(null);
  const [result, mapped] = await Promise.all([loadStorageContents(id), mapRequest]);
  let context: StorageMapContext | null = null;
  if (result.storage.kind === 'placement' && result.storage.node_id !== null) {
    if (provided) context = provided;
    else if (mapped?.bounds) context = { map: mapped, bounds: mapped.bounds };
    else {
      const screen = await loadWorldScreen(result.storage.node_id);
      if (!screen.map || !screen.navigation?.node.map) throw new Error('missing-placement-map');
      context = { map: screen.map, bounds: screen.navigation.node.map };
    }
  }
  return { view: result, context };
}
function input(target: StorageView, position: number) {
  if (!props.writable || !source.value || !item.value) return null;
  return storageTransfer(source.value, item.value, target, position, target.storage.kind === 'placement' ? 1 : quantity.value ?? 0, instance.value, panels.value.find(panel => panel.view?.storage.id === target.storage.id)?.context);
}
function destinations(target: StorageView) {
  if (blocked.value) return [];
  return Array.from({ length: target.storage.capacity }, (_, index) => index + 1).filter(position => input(target, position));
}
async function loadTarget() {
  const current = ++targetGeneration, id = destination.value;
  targetView.value = null; rightContext.value = null; targetLoading.value = false; cancelDrag();
  if (!id || id === view.value?.storage.id) return;
  targetLoading.value = true;
  try { const result = await readView(id); if (!disposed && current === targetGeneration) { targetView.value = result.view; rightContext.value = result.context; } }
  catch (cause) { if (!disposed && current === targetGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === targetGeneration) targetLoading.value = false; }
}
async function load(chosen?: number) {
  const current = ++generation; operation++; targetGeneration++; cancelDrag();
  loading.value = true; transferring.value = false; view.value = null; targetView.value = null; leftContext.value = null; rightContext.value = null; headers.value = []; selected.value = null; error.value = '';
  try {
    const list = await loadStorageList(props.nodeId);
    if (disposed || current !== generation) return;
    const id = chosen ?? props.storageId ?? (props.nodeId === null ? list.find(row => row.kind === 'backpack')?.id : list.find(row => row.kind === 'placement' && row.node_id === props.nodeId)?.id);
    headers.value = list;
    const targets = list.filter(row => row.kind !== 'recovery' && row.id !== id);
    const next = targets.some(option => option.id === destination.value) ? destination.value : targets.find(option => option.kind === 'backpack')?.id ?? targets[0]?.id ?? null;
    if (next === destination.value) void loadTarget(); else destination.value = next;
    if (id) {
      const result = await readView(id);
      if (disposed || current !== generation) return;
      view.value = result.view; leftContext.value = result.context;
      if (!list.some(header => header.id === id)) headers.value = [...list, result.view.storage];
    }
  } catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
async function refreshContents() {
  const current = generation, target = targetGeneration, ids = [view.value?.storage.id, targetView.value?.storage.id].filter((id): id is number => !!id);
  const selection = { id: selected.value, storage: source.value?.storage.id, position: item.value?.position };
  try {
    const result = await Promise.all(ids.map(loadStorageContents));
    if (disposed || current !== generation) return;
    for (const row of result) {
      if (row.storage.id === view.value?.storage.id) view.value = row;
      if (target === targetGeneration && row.storage.id === targetView.value?.storage.id) targetView.value = row;
    }
    if (selected.value === selection.id && selection.id !== null) selected.value = result.find(row => row.storage.id === selection.storage)?.items.find(row => row.position === selection.position)?.id ?? null;
  } catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
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
  const before = { view: view.value, target: targetView.value, selected: selected.value, quantity: quantity.value, instance: instance.value }, originalSource = source.value!;
  const [projectedSource, projectedTarget] = optimisticTransfer(originalSource, target, payload);
  for (const projected of [projectedSource, projectedTarget]) {
    if (view.value?.storage.id === projected.storage.id) view.value = projected;
    if (targetView.value?.storage.id === projected.storage.id) targetView.value = projected;
  }
  selected.value = projectedSource.items.find(row => row.id === payload.inventory_id)?.id ?? projectedTarget.items.find(row => row.position === payload.position)?.id ?? null;
  quantity.value = Math.min(quantity.value ?? 1, item.value?.quantity ?? 1); instance.value = null;
  function rollback() { if (!disposed && current === operation) { view.value = before.view; targetView.value = before.target; selected.value = before.selected; quantity.value = before.quantity; instance.value = before.instance; } }
  try {
    const quote = await previewTransfer(payload);
    if (disposed || current !== operation || !props.writable) return;
    await props.command.submit('/storage/transfer', { ...payload }, quote);
    if (!disposed && current === operation) {
      if (pending.value || props.command.error.value) { rollback(); error.value = props.command.error.value; }
      else { notice.value = 'Предметы перемещены.'; await refreshContents(); }
    }
  } catch (cause) { rollback(); if (!disposed && current === operation) error.value = worldError(cause); }
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
watch(() => props.revision, () => { if (!transferring.value && !loading.value) void refreshContents(); });
watch([() => props.nodeId, () => props.storageId, () => props.session], () => { pathEpoch++; storagePaths.value = {}; pathLoading.value = []; pathErrors.value = []; destination.value = null; notice.value = ''; void load(); }, { immediate: true, flush: 'sync' });
watch(() => props.writable, () => { operation++; transferring.value = false; cancelDrag(); void refreshContents(); }, { flush: 'sync' });
onScopeDispose(() => { disposed = true; generation++; targetGeneration++; operation++; });
</script>
<template lang="pug">
section.world-storage(aria-label="Вещи и размещение" @keydown.esc="selected = null; cancelDrag()")
  .storage-heading
    h2 Вещи и размещение
    router-link.storage-page-link(v-if="!storageId && view" :to="link(view.storage.id)") На страницу хранилища →
  n-alert(closable v-if="error" type="error" role="alert") {{ error }}
  p.storage-status(role="status") {{ transferring ? 'Сохраняем перемещение…' : notice }}
  p.storage-hint Перетащите вещь в свободную ячейку или на такую же стопку. Можно нажать на предмет, затем на подсвеченное место. Перенос — бесплатно; помещение в сундук расходует его прочность.
  .storage-panes
    section.storage-pane(v-for="(panel, index) in panels" :key="index" :aria-label="index === 0 ? 'Левое хранилище' : 'Правое хранилище'")
      span.storage-eyebrow(v-if="index === 0") {{ storageId ? 'Левое хранилище' : 'Размещение в активной ноде' }}
      h3(v-if="index === 0 && !storageId") Слоты ноды «{{ node?.label || panel.view?.location?.name || nodeId }}»
      h3(v-else) {{ panel.view?.storage.name || 'Выберите хранилище' }}
      .storage-choices(v-if="storageId || index === 1" role="group" :aria-label="index === 0 ? 'Выбор левого хранилища' : 'Выбор правого хранилища'")
        n-popover(v-for="header in choices" :key="header.id" trigger="hover" placement="bottom" :style="{ maxWidth: 'min(22rem, calc(100vw - 3rem))' }" @update:show="value => { if (value) loadStoragePath(header); }")
          template(#trigger)
            span.storage-choice-trigger(@focusin="loadStoragePath(header)")
              n-button(:theme-overrides="header.id === panel.view?.storage.id ? worldActionButtonTheme : worldNeutralButtonTheme" size="small" :title="`${storageName(header)} · ${header.node_id ? 'объект №' + header.node_id : 'хранилище №' + header.id}`" :aria-pressed="header.id === panel.view?.storage.id" :disabled="blocked || header.id === (index === 0 ? destination : view?.storage.id)" @click="chooseStorage(index, header.id)") {{ storageName(header) }}
          .storage-choice-path
            strong {{ storageName(header) }}
            small {{ header.node_id ? 'Объект №' + header.node_id : 'Хранилище №' + header.id }}
            p(v-if="!header.node_id") Личное хранилище персонажа.
            p(v-else-if="pathLoading.includes(header.node_id)") Загружаем расположение…
            p(v-else-if="pathErrors.includes(header.node_id)") Не удалось загрузить расположение.
            ol(v-else-if="storagePaths[header.node_id]" aria-label="Расположение хранилища")
              li(v-for="(ancestor, depth) in storagePaths[header.node_id]" :key="ancestor.id" :style="{ paddingLeft: `${depth * .6}rem` }")
                span(aria-hidden="true") {{ depth ? '↳ ' : '' }}
                | {{ ancestor.label }}
                small №{{ ancestor.id }}
      .storage-loading(v-if="panel.loading" role="status" aria-label="Загрузка слотов хранилища")
        n-skeleton(v-for="slot in 6" :key="slot" height="100px" :sharp="false")
      template(v-else-if="panel.view")
        small {{ panel.view.items.length }} / {{ panel.view.storage.capacity }} мест занято
        p(v-if="!props.writable || !panel.view.writable") Только просмотр
        world-storage-grid(:view="panel.view" :context="panel.context" :selected="selected" :blocked="blocked" :dragging="drag?.moved ? drag.item : null" :target="hover" :destinations="destinations(panel.view)" @choose="choose(panel.view, $event)" @down="(event, position) => down(event, panel.view, position)" @move="move" @up="up" @cancel="cancelDrag")
          template(#selected-item)
            .transfer-controls(v-if="item" role="region" aria-label="Выбранный предмет" @keydown.esc.stop="selected = null; cancelDrag()")
              button.transfer-close(type="button" aria-label="Снять выбор" title="Снять выбор" :disabled="blocked" @click="selected = null")
                font-awesome-icon(icon="times" aria-hidden="true")
              strong.transfer-item {{ item.name }}
              .transfer-quantity
                n-input-number(v-model:value="quantity" :min="1" :max="Math.min(item.quantity, 10000)" :precision="0" :disabled="blocked || !!instance" aria-label="Количество предметов" :input-props="{ 'aria-label': 'Количество предметов' }")
                n-button(:theme-overrides="worldActionButtonTheme" size="small" :disabled="blocked || !!instance" @click="quantity = Math.min(item.quantity, 10000)") Вся стопка
              small Нажмите на подсвеченное место назначения. Для размещения станции или сундука переносится 1 шт.
              n-select(v-if="unitOptions.length" v-model:value="instance" :options="unitOptions" clearable :disabled="blocked || quantity !== 1" placeholder="Экземпляр: автоматически" aria-label="Экземпляр оборудования")
              router-link(v-if="item.inner_storage_id" :to="link(item.inner_storage_id)") Открыть сундук
              router-link(v-for="unit in item.instances" :key="unit.id" :to="`/world/equipment/${unit.id}/wear`") Прочность {{ unit.durability }}/{{ unit.max_durability }} · история
          template(#after-cells)
            world-storage-expansion(cell :storage="panel.view.storage.id" :session="session" :revision="panel.view.storage.revision" :writable="writable && panel.view.writable" :command="command" @changed="refreshContents()")
        world-chest-repair(v-if="panel.view.storage.kind === 'chest'" :storage="panel.view.storage" :command="command" :writable="props.writable && panel.view.writable" :session="session")
      p(v-else-if="index === 0 && !storageId") В активной ноде нет слотов для размещения предметов.
      p(v-else) Доступное хранилище не выбрано.
</template>
<style scoped>
.world-storage { display: grid; gap: .75rem; min-width: 0; }.storage-heading { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }.storage-heading h2 { margin: 0; }.storage-hint { margin: 0; color: var(--text-muted); font-size: .85rem; }
.transfer-controls { position: relative; display: grid; gap: .6rem; min-width: 0; width: 100%; color: var(--text); }
.transfer-item { padding-right: 2rem; }
.transfer-close { position: absolute; right: -.25rem; top: -.25rem; display: grid; place-items: center; width: 2rem; height: 2rem; padding: 0; border: 0; border-radius: .4rem; background: transparent; color: var(--text-muted); cursor: pointer; }
.transfer-close:hover { color: var(--text); background: var(--primary-soft); }
.transfer-close:focus-visible { outline: 2px solid var(--primary); }
.transfer-close:disabled { cursor: default; opacity: .5; }
.transfer-quantity { display: flex; align-items: center; gap: .5rem; }.transfer-quantity :deep(.n-input-number) { min-width: 0; flex: 1; }
.transfer-controls > small { color: var(--text-muted); font-size: .75rem; }
.storage-panes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }.storage-pane { display: grid; align-content: start; gap: .6rem; min-width: 0; padding: .75rem; border: 1px solid var(--border); border-radius: .6rem; }.storage-pane h3 { margin: 0; }.storage-pane label { display: grid; gap: .35rem; }
.storage-choices { display: flex; flex-wrap: wrap; gap: .4rem; min-width: 0; }.storage-choices :deep(button) { max-width: 100%; height: auto; min-height: 2rem; padding-block: .35rem; }.storage-choices :deep(.n-button__content) { white-space: normal; overflow-wrap: anywhere; }
.storage-choice-trigger { display: inline-flex; min-width: 0; max-width: 100%; }
.storage-choice-path { display: grid; gap: .35rem; color: var(--text); }.storage-choice-path small { color: var(--text-muted); font-size: .75rem; }.storage-choice-path p { margin: 0; font-size: .8rem; }
.storage-choice-path ol { list-style: none; margin: .35rem 0 0; padding: 0; }.storage-choice-path li { overflow-wrap: anywhere; font-size: .8rem; }.storage-choice-path li small { margin-left: .4rem; }
.storage-page-link { display: inline-flex; align-items: center; min-height: 2.75rem; padding: .4rem .8rem; border-radius: .375rem; background: var(--primary); color: var(--text-on-acc); font-size: .875rem; }
.storage-page-link:hover { background: var(--primary-press); color: var(--text-on-acc); }
.storage-eyebrow { color: var(--primary); font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.storage-loading { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .45rem; }
.storage-pane { background: var(--bg-surface); }
.storage-status { min-height: 1.3em; margin: 0; color: var(--text-muted); font-size: .85rem; }
@media(max-width: 700px) { .storage-panes { grid-template-columns: 1fr; } }
@media(max-width: 620px) {
  .world-storage { gap: .6rem; }
  .storage-heading { flex-wrap: wrap; }
  .storage-heading h2 { font-size: 1.1rem; }
  .storage-page-link { min-height: 2.5rem; padding: .3rem .5rem; font-size: .8rem; }
  .storage-pane { padding: .6rem; gap: .4rem; }
  .storage-pane h3 { font-size: 1rem; }
  .storage-status:empty { display: none; }
}
</style>

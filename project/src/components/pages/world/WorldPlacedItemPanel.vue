<script setup lang="ts">
import { worldActionButtonTheme } from '@/entities/world/theme';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton } from 'naive-ui';
import type { PlacedWorldItem } from '@/entities/world/types';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadStorageContents, loadStorageList, previewTransfer } from '@/services/api/worldStorage';
import { storageTransfer } from '@/entities/world/storageInteraction';
import { worldError } from '@/services/api/world';
import WorldHousingPanel from './WorldHousingPanel.vue';
const props = defineProps<{ item: PlacedWorldItem; nodeId: number; session: number; writable: boolean; command: WorldCommandRunner }>();
const emit = defineEmits<{ changed: [ids: number[]] }>();
const loading = ref(false), error = ref('');
const blocked = computed(() => loading.value || !props.writable || props.command.busy.value || !!props.command.pending.value);
let epoch = 0, disposed = false;
watch(() => [props.item.inventory_id, props.nodeId, props.session], () => { epoch++; error.value = ''; loading.value = false; });
onScopeDispose(() => { disposed = true; epoch++; });
async function take() {
  if (blocked.value || !props.item.inventory_id || !props.item.storage_id) return;
  const current = ++epoch, node = props.nodeId, inventory = props.item.inventory_id, storage = props.item.storage_id;
  loading.value = true; error.value = '';
  try {
    const list = await loadStorageList(node), backpack = list.find(row => row.kind === 'backpack');
    if (!backpack) { if (!disposed && current === epoch) error.value = 'Рюкзак недоступен.'; return; }
    const [source, target] = await Promise.all([loadStorageContents(storage), loadStorageContents(backpack.id)]);
    if (disposed || current !== epoch || !props.writable) return;
    const item = source.items.find(row => row.id === inventory);
    if (!item) { error.value = 'Предмет уже перемещён. Обновите карту.'; return; }
    const position = Array.from({ length: target.storage.capacity }, (_, index) => index + 1).find(position => !target.items.some(row => row.position === position));
    const input = position ? storageTransfer(source, item, target, position, item.quantity, null) : null;
    if (!input) { error.value = 'В рюкзаке нет свободной ячейки.'; return; }
    const quote = await previewTransfer(input);
    if (disposed || current !== epoch || !props.writable) return;
    await props.command.submit('/storage/transfer', { ...input }, quote);
    if (!disposed && current === epoch && !props.command.error.value && !props.command.pending.value) emit('changed', [node]);
  } catch (cause) { if (!disposed && current === epoch) error.value = worldError(cause); }
  finally { if (!disposed && current === epoch) loading.value = false; }
}
</script>
<template lang="pug">
section.placed-item
  h3.world-selected-heading
    font-awesome-icon(:icon="item.icon || 'cube'" aria-hidden="true")
    span {{ item.name || 'Предмет' }}
  p(v-if="item.description") {{ item.description }}
  dl
    dt Количество
    dd {{ item.quantity ?? 1 }}
    template(v-for="property in item.characteristics ?? []" :key="property.label")
      dt {{ property.label }}
      dd {{ property.value }}
    dt Ячейка
    dd {{ item.x }}, {{ item.y }}
  n-button(:theme-overrides="worldActionButtonTheme" v-if="item.inventory_id && item.storage_id" :disabled="blocked" :loading="loading" @click="take")
    template(#icon)
      font-awesome-icon(icon="bag-shopping")
    | Забрать в рюкзак
  world-housing-panel(v-if="item.lodging && item.inventory_id" :key="`${nodeId}:${item.inventory_id}`" :node-id="nodeId" :session="session" :command="command" :writable="writable")
  n-alert(closable v-if="error" type="error") {{ error }}
</template>
<style scoped>
.placed-item { display: grid; gap: .75rem; overflow-wrap: anywhere; }
h3, p, dl { margin: 0; }.world-selected-heading { display: flex; gap: .5rem; align-items: center; }
dl { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }dt { color: var(--text-muted); }dd { margin: 0; text-align: right; }
</style>

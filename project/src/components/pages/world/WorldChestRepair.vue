<script setup lang="ts">
import { onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton } from 'naive-ui';
import { previewChestRepair, type StorageHeader } from '@/services/api/worldStorage';
import { worldError } from '@/services/api/world';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
const props = defineProps<{ storage: StorageHeader; command: WorldCommandRunner; writable: boolean; session: number }>();
const calculation = shallowRef<Awaited<ReturnType<typeof previewChestRepair>> | null>(null), loading = ref(false), error = ref('');
const { busy, pending } = props.command;
let generation = 0;
watch([() => props.storage.id, () => props.storage.revision, () => props.session], () => { generation++; calculation.value = null; error.value = ''; loading.value = false; });
async function preview() {
  if (!props.storage.container_inventory_id || busy.value || pending.value || !props.writable) return;
  const current = ++generation; loading.value = true; error.value = '';
  try { const value = await previewChestRepair(props.storage.id, props.storage.container_inventory_id); if (current === generation) calculation.value = value; }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) loading.value = false; }
}
function repair() {
  if (!calculation.value || calculation.value.repair.reasons.length || !props.writable) return;
  void props.command.submit('/storage/chest-repair', { storage_id: props.storage.id, container_inventory_id: props.storage.container_inventory_id }, calculation.value.quote);
}
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
section.chest-repair(v-if="storage.kind === 'chest'")
  h3 Починка сундука
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-button(:loading="loading" :disabled="busy || Boolean(pending) || !writable" @click="preview") Рассчитать ремонт
  template(v-if="calculation")
    p Восстановление прочности: {{ calculation.repair.restore }}
    ul
      li(v-for="material in calculation.repair.materials" :key="material.item_id" :class="{missing: material.available === false || material.have < material.quantity}") {{ material.name || 'Материал' }}: {{ material.have }} / {{ material.quantity }}
      li(v-for="tool in calculation.repair.tools" :key="`tool-${tool.item_id}`" :class="{missing: tool.available === false}") {{ tool.name || 'Инструмент' }} · прочность {{ tool.durability }} / {{ tool.max_durability }}
      li(v-if="calculation.repair.station" :class="{missing: calculation.repair.station.available === false}") {{ calculation.repair.station.name }} · {{ calculation.repair.station.durability ?? '—' }} / {{ calculation.repair.station.max_durability ?? '—' }}
    p.missing(v-for="reason in calculation.repair.reasons" :key="reason") {{ reason }}
    n-button(type="primary" :loading="busy" :disabled="Boolean(pending) || !writable || Boolean(calculation.repair.reasons.length)" @click="repair") Починить
</template>
<style scoped>
.chest-repair { display: grid; gap: .75rem; }
.missing { color: var(--error, #d03050); font-weight: 600; }
</style>

<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NInput, NInputNumber, NSelect } from 'naive-ui';
import { previewWorldManagement, worldError, type ManagementAction } from '@/services/api/world';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import type { WorldNode, WorldQuote } from '@/entities/world/types';
const props = defineProps<{ node: WorldNode; writable: boolean; command: WorldCommandRunner; session: number }>();
const action = ref<ManagementAction>('move'), parent = ref<number | null>(null), reason = ref(''), previewing = ref(false), previewError = ref('');
const quote = shallowRef<WorldQuote | null>(null);
const payload = computed(() => ({ reason: reason.value.trim(), ...(action.value === 'move' ? { parent_id: parent.value } : {}) }));
const runner = props.command;
const { busy, pending } = runner;
let generation = 0;
watch([() => props.node.id, action, parent, reason, () => props.session], () => { generation++; quote.value = null; previewError.value = ''; previewing.value = false; });
onScopeDispose(() => { generation++; });
async function preview() {
  if (!props.writable || busy.value || pending.value || reason.value.trim() === '' || (action.value === 'move' && !props.node.portable)) return;
  const current = ++generation; previewing.value = true; previewError.value = '';
  try { const result = await previewWorldManagement(props.node.id, action.value, payload.value); if (current === generation) quote.value = result; }
  catch (cause) { if (current === generation) previewError.value = worldError(cause); }
  finally { if (current === generation) previewing.value = false; }
}
function confirm() { if (quote.value) void runner.submit(`/nodes/${props.node.id}/${action.value}`, payload.value, quote.value); }
</script>
<template lang="pug">
section.world-management(v-if="node.permissions.administer" aria-label="Управление объектом")
  h3 Управление объектом
  n-alert(v-if="!node.portable" type="info") Этот объект закреплён на месте. Включите параметр «Можно перемещать» в административной карточке объекта, чтобы разрешить перенос.
  n-alert(v-if="!writable" type="info") Изменение мира временно отключено.
  n-alert(v-if="previewError" type="error" role="alert") {{ previewError }}
  template(v-if="!pending")
    n-select(v-model:value="action" :options="[{label: 'Перенести', value: 'move'}, {label: 'Архивировать', value: 'archive'}]" :disabled="!writable || busy" aria-label="Действие")
    n-input-number(v-if="action === 'move'" v-model:value="parent" :min="1" :max="2147483647" :precision="0" :disabled="!node.portable || !writable || busy" placeholder="ID нового родительского объекта" aria-label="ID нового родительского объекта")
    n-input(v-model:value="reason" :maxlength="255" :disabled="!writable || busy" placeholder="Причина изменения" aria-label="Причина изменения")
    n-button(:disabled="!writable || busy || !reason.trim() || (action === 'move' && (!node.portable || !parent))" :loading="previewing" @click="preview") Подготовить изменение
    template(v-if="quote")
      p {{ action === 'move' ? 'Перенести объект в выбранное место?' : 'Архивировать этот объект?' }}
      n-button(type="primary" :loading="busy" :disabled="!writable" @click="confirm") Подтвердить
</template>
<style scoped>
.world-management { display: grid; gap: .75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border); max-width: 36rem; }
</style>

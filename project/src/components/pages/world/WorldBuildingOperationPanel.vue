<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSpin } from 'naive-ui';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { buildingStatuses, loadBuildingOperation, previewBuildingOperation, type BuildingAction } from '@/services/api/worldBuildingOperation';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; session: number; writable: boolean; command: WorldCommandRunner }>();
const state = shallowRef<Awaited<ReturnType<typeof loadBuildingOperation>> | null>(null);
const quote = shallowRef<Awaited<ReturnType<typeof previewBuildingOperation>> | null>(null);
const error = ref(''), loading = ref(false), calculating = ref(false), { busy, pending } = props.command;
const locked = computed(() => busy.value || Boolean(pending.value) || !props.writable || !state.value?.writable);
const labels: Record<BuildingAction, string> = { pause: 'Приостановить работу', resume: 'Возобновить работу' };
let generation = 0, previewGeneration = 0, disposed = false;
function clear() { previewGeneration++; quote.value = null; calculating.value = false; }
async function load() {
  const current = ++generation; clear(); state.value = null; loading.value = true; error.value = '';
  try { const result = await loadBuildingOperation(props.nodeId); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session], load, { immediate: true, flush: 'sync' });
watch([busy, () => props.writable], clear, { flush: 'sync' });
async function preview(action: BuildingAction) {
  if (locked.value || calculating.value || loading.value) return;
  clear(); const current = previewGeneration; calculating.value = true; error.value = '';
  try { const result = await previewBuildingOperation(props.nodeId, action); if (!disposed && current === previewGeneration) quote.value = result; }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
function confirm() {
  if (!quote.value || locked.value || calculating.value || loading.value) return;
  void props.command.submit(`/nodes/${quote.value.node}/building-${quote.value.action}`, {}, quote.value.quote);
}
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.world-building-operation#building-operation
  h2 Работа постройки
  n-button(:loading="loading" :disabled="busy || Boolean(pending)" @click="load") Обновить состояние
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка состояния постройки")
  template(v-else-if="state")
    p {{ buildingStatuses[state.status] }} · Прочность: {{ state.condition }} / {{ state.maxCondition }}.
    p Комнат: {{ state.roomCount }}. Активных назначений ночлега: {{ state.lodgingCount }}.
    ul(v-if="state.reasons.length")
      li(v-for="reason in state.reasons" :key="reason") {{ reason }}
    p(v-if="state.status === 'paused'") Станции недоступны для работы, размещение вещей и назначение ночлега закрыты. Вещи можно забрать. После запуска назначьте ночлег заново в комнате дома.
    n-button(v-if="state.action" :disabled="locked || calculating" :loading="calculating" @click="preview(state.action)") {{ labels[state.action] }}…
  n-alert(v-if="quote" type="warning" aria-live="polite")
    h3 {{ labels[quote.action] }}: {{ quote.name }}
    template(v-if="quote.action === 'pause'")
      p Станции перестанут работать, размещение вещей и новый ночлег будут недоступны во всех комнатах этой постройки. Вещи останутся на местах, их можно будет забрать.
      p(v-if="quote.lodgingCount") Текущее назначение ночлега будет отменено. Выберите другое укрытие до следующей ночи, чтобы избежать болезни.
      p Пауза не меняет защиту оборудования от погоды, не восстанавливает прочность и не отменяет финансовые обязательства.
    p(v-else) Работа станций и размещение вещей станут доступны. Для ночлега потребуется снова выбрать спальное место в комнате дома.
    p Стоимость действия: 0 Cr.
    n-button(type="primary" :disabled="locked" @click="confirm") Подтвердить
    n-button(:disabled="busy" @click="clear") Отмена
</template>
<style scoped>
.world-building-operation { display: grid; gap: .75rem; }
</style>

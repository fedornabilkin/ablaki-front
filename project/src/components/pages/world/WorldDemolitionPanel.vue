<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NCheckbox, NSpin } from 'naive-ui';
import { RouterLink } from 'vue-router';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadDemolition, previewDemolition } from '@/services/api/worldDemolition';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; session: number; writable: boolean; command: WorldCommandRunner }>();
const state = shallowRef<Awaited<ReturnType<typeof loadDemolition>> | null>(null), quote = shallowRef<Awaited<ReturnType<typeof previewDemolition>> | null>(null);
const loading = ref(false), calculating = ref(false), acknowledged = ref(false), error = ref(''), { busy, pending } = props.command;
const locked = computed(() => busy.value || Boolean(pending.value) || !props.writable || !state.value?.writable || !state.value?.available);
let generation = 0, previewGeneration = 0, disposed = false;
function clear() { previewGeneration++; quote.value = null; calculating.value = false; acknowledged.value = false; }
async function load() {
  const current = ++generation; clear(); state.value = null; loading.value = true; error.value = '';
  try { const value = await loadDemolition(props.nodeId); if (!disposed && current === generation) state.value = value; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session], load, { immediate: true, flush: 'sync' });
watch([busy, () => props.writable], clear, { flush: 'sync' });
async function preview() {
  if (locked.value || calculating.value || loading.value) return;
  clear(); const current = previewGeneration; calculating.value = true; error.value = '';
  try { const value = await previewDemolition(props.nodeId); if (!disposed && current === previewGeneration) quote.value = value; }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
function confirm() {
  if (!quote.value || !acknowledged.value || locked.value || calculating.value || loading.value) return;
  void props.command.submit(`/nodes/${quote.value.node}/demolish`, {}, quote.value.quote);
}
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.world-demolition#demolition
  h2 Снос постройки
  p Перед сносом заберите имущество, отмените ночлег и завершите финансовые обязательства. Бюджеты и казны здания и комнаты должны быть пустыми.
  n-button(:loading="loading" :disabled="busy || Boolean(pending)" @click="load") Обновить условия сноса
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка условий сноса")
  template(v-else-if="state")
    ul(v-if="state.reasons.length")
      li(v-for="reason in state.reasons" :key="reason.code") {{ reason.message }}
    p(v-if="state.available") Постройка свободна. После сноса освободится площадь: {{ state.area }}.
    n-button(:disabled="locked || calculating" :loading="calculating" @click="preview") Рассмотреть снос…
  n-alert(v-if="quote" type="warning" aria-live="polite")
    h3 Снести «{{ quote.name }}»
    p Постройка и её комната уйдут в архив. Купленные места оборудования закроются. Площадь {{ quote.area }} освободится для новой покупки или стройки.
    p Снос бесплатный. Стоимость покупки и расширений не возвращается, материалы не выдаются. Восстановить эту постройку через интерфейс нельзя.
    p История покупки, ремонта, ночлега и платежей сохранится.
    p
      router-link(:to="`/world/nodes/${quote.plot}`") Площадка, на которой освободится место
    n-checkbox(v-model:checked="acknowledged" :disabled="busy") Подтверждаю снос без возврата стоимости и материалов
    div
      n-button(type="error" :disabled="locked || !acknowledged" @click="confirm") Снести без возврата
      n-button(:disabled="busy" @click="clear") Отмена
</template>
<style scoped>
.world-demolition { display: grid; gap: .75rem; }
</style>

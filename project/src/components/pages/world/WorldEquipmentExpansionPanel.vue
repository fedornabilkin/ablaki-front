<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NCheckbox, NInputNumber, NSpin } from 'naive-ui';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadEquipmentExpansion, previewEquipmentExpansion } from '@/services/api/worldEquipmentExpansion';
import { worldError } from '@/services/api/world';
import WorldExpansionCost from './WorldExpansionCost.vue';
const props = defineProps<{ nodeId: number; session: number; command: WorldCommandRunner }>();
const state = shallowRef<Awaited<ReturnType<typeof loadEquipmentExpansion>> | null>(null), quote = shallowRef<Awaited<ReturnType<typeof previewEquipmentExpansion>> | null>(null);
const quantity = ref<number | null>(1), topUp = ref(false), error = ref(''), loading = ref(false), calculating = ref(false), { busy, pending } = props.command;
const locked = computed(() => busy.value || Boolean(pending.value) || !state.value?.writable);
let generation = 0, previewGeneration = 0, disposed = false;
function clear() { previewGeneration++; quote.value = null; calculating.value = false; }
async function load() {
  const current = ++generation; clear(); state.value = null; loading.value = true; error.value = '';
  try { const result = await loadEquipmentExpansion(props.nodeId); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session], () => { quantity.value = 1; topUp.value = false; void load(); }, { immediate: true, flush: 'sync' });
watch([busy, quantity, topUp], clear, { flush: 'sync' });
async function preview() {
  if (locked.value || calculating.value) return;
  clear(); const current = previewGeneration; calculating.value = true; error.value = '';
  try { const result = await previewEquipmentExpansion(props.nodeId, { quantity: quantity.value, top_up: topUp.value }); if (!disposed && current === previewGeneration) quote.value = result; }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = cause instanceof Error && cause.message.startsWith('invalid-') ? 'Проверьте количество мест и обновите состояние.' : worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
async function confirm() {
  if (!quote.value || locked.value) return;
  const selected = quote.value;
  await props.command.submit(`/nodes/${props.nodeId}/equipment-expand`, selected.input, selected.quote);
  if (!disposed && !pending.value) void load();
}
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.equipment-expansion
  h2 Места оборудования
  n-button(:loading="loading" :disabled="busy || Boolean(pending)" @click="load") Обновить места
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка расширений")
  template(v-else-if="state")
    p(v-if="!state.supported") Условия покупки этого помещения не предусматривают дополнительные места.
    template(v-else-if="state.expansion")
      p Доступно {{ state.expansion.unlocked }} из {{ state.expansion.limit }} мест; {{ state.expansion.initial }} включено в покупку. Свободный бюджет комнаты: {{ state.available }} Cr.
      p Станцию или сундук нужно разместить отдельно. Новые места сохраняют защиту помещения и не увеличивают его площадь.
      ul.places
        li(v-for="place in state.expansion.places" :key="place.position") Место {{ place.position }}: {{ place.unlocked ? 'открыто' : `закрыто, ${place.price} Cr` }}
      router-link(:to="{ path: `/world/storage/${state.expansion.storageId}`, query: { node_id: nodeId } }") Открыть размещённые вещи
      p(v-if="state.expansion.unlocked === state.expansion.limit") Все предусмотренные места открыты.
      template(v-else)
        p(v-if="!state.writable") Покупки сейчас недоступны. Помещение должно действовать, а экономика и хранение мира — быть включены.
        label Количество следующих мест
          n-input-number(v-model:value="quantity" :min="1" :max="state.expansion.limit - state.expansion.unlocked" :precision="0" :disabled="locked")
        n-checkbox(v-model:checked="topUp" :disabled="locked") Пополнить недостающую сумму с личного баланса
        n-button(:disabled="locked || calculating" @click="preview") Рассчитать расширение
    section(v-if="quote" aria-live="polite")
      h3 Подтвердить покупку мест
      p Источник оплаты — бюджет этой комнаты. Открытые места сохраняются постоянно.
      p(v-if="quote.input.quantity >= 3") Системная скидка 5% включена в расчёт, так как вы открываете сразу три места.
      world-expansion-cost(:prices="quote.unitPrices" :payment="quote.payment" place-label="Место")
      n-button(type="primary" :disabled="locked" @click="confirm") Подтвердить оплату
</template>
<style scoped>
.equipment-expansion { display: grid; gap: .75rem; }
.places { padding-left: 1.25rem; }
label { display: grid; gap: .3rem; max-width: 28rem; }
</style>

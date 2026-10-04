<script setup lang="ts">
import { discountedCredits, formatCredits } from '@/entities/world/credits';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NCheckbox, NInputNumber, NSpin } from 'naive-ui';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadEquipmentExpansion, previewEquipmentExpansion } from '@/services/api/worldEquipmentExpansion';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; session: number; command: WorldCommandRunner }>();
const state = shallowRef<Awaited<ReturnType<typeof loadEquipmentExpansion>> | null>(null);
const quantity = ref<number | null>(1), topUp = ref(false), error = ref(''), loading = ref(false), calculating = ref(false), { busy, pending } = props.command;
const locked = computed(() => busy.value || Boolean(pending.value) || !state.value?.writable);
const price = computed(() => {
  const expansion = state.value?.expansion, count = quantity.value;
  if (!expansion || !count || !Number.isSafeInteger(count) || count < 1 || count > expansion.limit - expansion.unlocked) return null;
  return discountedCredits(expansion.places.filter(place => !place.unlocked).slice(0, count).map(place => place.price), count >= 3 ? 500 : 0);
});
let generation = 0, previewGeneration = 0, disposed = false;
function clear() { previewGeneration++; calculating.value = false; }
async function load() {
  const current = ++generation; clear(); state.value = null; loading.value = true; error.value = '';
  try { const result = await loadEquipmentExpansion(props.nodeId); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session], () => { quantity.value = 1; topUp.value = false; void load(); }, { immediate: true, flush: 'sync' });
watch([busy, quantity, topUp], clear, { flush: 'sync' });
async function preview() {
  if (locked.value || calculating.value || !price.value) return;
  const expectedPrice = price.value;
  clear(); const current = previewGeneration; calculating.value = true; error.value = '';
  try {
    const result = await previewEquipmentExpansion(props.nodeId, { quantity: quantity.value, top_up: topUp.value });
    if (disposed || current !== previewGeneration) return;
    if (result.payment.total !== expectedPrice) { error.value = 'Цена изменилась. Обновите места и проверьте стоимость.'; return; }
    await props.command.submit(`/nodes/${props.nodeId}/equipment-expand`, result.input, result.quote);
    if (!disposed && !pending.value && !props.command.error.value) void load();
  }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = cause instanceof Error && cause.message.startsWith('invalid-') ? 'Проверьте количество мест и обновите состояние.' : worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
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
      p Доступно {{ state.expansion.unlocked }} из {{ state.expansion.limit }} мест; {{ state.expansion.initial }} включено в покупку. Свободный бюджет комнаты: {{ formatCredits(state.available) }} Cr.
      p Станцию или сундук нужно разместить отдельно. Новые места сохраняют защиту помещения и не увеличивают его площадь.
      ul.places
        li(v-for="place in state.expansion.places" :key="place.position")
          font-awesome-icon(:icon="place.unlocked ? 'industry' : 'lock'" aria-hidden="true")
          strong Место {{ place.position }}
          span {{ place.unlocked ? 'Доступно' : `Закрыто · ${formatCredits(place.price)} Cr` }}
      router-link(:to="{ path: `/world/storage/${state.expansion.storageId}`, query: { node_id: nodeId } }") Открыть размещённые вещи
      p(v-if="state.expansion.unlocked === state.expansion.limit") Все предусмотренные места открыты.
      template(v-else)
        p(v-if="!state.writable") Покупки сейчас недоступны. Помещение должно действовать, а экономика и хранение мира — быть включены.
        label Количество следующих мест
          n-input-number(v-model:value="quantity" :min="1" :max="state.expansion.limit - state.expansion.unlocked" :precision="0" :disabled="locked")
        n-checkbox(v-model:checked="topUp" :disabled="locked") Пополнить недостающую сумму с личного баланса
        p(v-if="quantity && quantity >= 3") В стоимость включена скидка 5%.
        n-button(type="primary" :disabled="locked || calculating || !price" @click="preview") Открыть {{ quantity }} · {{ formatCredits(price) }} Cr
</template>
<style scoped>
.equipment-expansion { display: grid; gap: .75rem; }
.places { padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: .6rem; }.places li { display: grid; gap: .5rem; padding: .75rem; border: 1px solid var(--border); border-radius: .5rem; }.places svg { color: var(--primary); font-size: 1.5rem; }.places span { color: var(--text-muted); font-size: .8rem; }
label { display: grid; gap: .3rem; max-width: 28rem; }
</style>

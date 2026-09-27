<script setup lang="ts">
import { computed, onScopeDispose, reactive, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NCheckbox, NInput, NInputNumber, NSpin } from 'naive-ui';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadGarden, previewGarden, type GardenAction } from '@/services/api/worldGarden';
import { worldError } from '@/services/api/world';
import WorldExpansionCost from './WorldExpansionCost.vue';
const props = defineProps<{ nodeId: number; session: number; writable: boolean; command: WorldCommandRunner }>();
const state = shallowRef<Awaited<ReturnType<typeof loadGarden>> | null>(null), quote = shallowRef<Awaited<ReturnType<typeof previewGarden>> | null>(null);
const form = reactive({ name: '', price: '', base_price: '' });
const topUp = ref(false), quantity = ref<number | null>(1), error = ref(''), loading = ref(false), calculating = ref(false), { busy, pending } = props.command;
const locked = computed(() => busy.value || Boolean(pending.value) || !props.writable);
const labels: Record<GardenAction, string> = { publish: 'Опубликовать цены', withdraw: 'Снять предложение', buy: 'Купить огород', expand: 'Открыть грядки' };
let generation = 0, previewGeneration = 0, disposed = false;
function clear() { previewGeneration++; quote.value = null; calculating.value = false; }
async function load() {
  const current = ++generation; clear(); state.value = null; loading.value = true; error.value = '';
  try { const result = await loadGarden(props.nodeId); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session], () => { topUp.value = false; quantity.value = 1; form.name = ''; form.price = ''; form.base_price = ''; void load(); }, { immediate: true, flush: 'sync' });
watch([busy, topUp, quantity, () => props.writable], clear, { flush: 'sync' });
watch(form, clear, { flush: 'sync' });
async function preview(action: GardenAction) {
  if (locked.value || calculating.value) return;
  clear(); const current = previewGeneration; calculating.value = true; error.value = '';
  try {
    const result = await previewGarden(props.nodeId, action, action === 'publish' ? { ...form } : action === 'withdraw' ? {} : { top_up: topUp.value, quantity: quantity.value });
    if (!disposed && current === previewGeneration) quote.value = result;
  } catch (cause) { if (!disposed && current === previewGeneration) error.value = cause instanceof Error && cause.message.startsWith('invalid-') ? 'Проверьте название, цены и количество грядок. Если данные верны, обновите состояние.' : worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
async function confirm() {
  if (!quote.value || locked.value) return;
  const selected = quote.value;
  await props.command.submit(`/nodes/${props.nodeId}/garden-${selected.action}`, selected.input, selected.quote);
  if (!disposed && !pending.value) void load();
}
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.world-garden#garden
  h2 Огород
  p Стартовый огород приобретается один раз в этом мире. В нём десять постоянных грядок: первая включена в покупку, остальные открываются последовательно. Посев и урожай появятся на следующем этапе.
  n-button(:loading="loading" :disabled="busy || Boolean(pending)" @click="load") Обновить огород
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка огорода")
  template(v-else-if="state")
    template(v-if="state.garden")
      router-link(v-if="state.garden.node_id !== nodeId" :to="`/world/nodes/${state.garden.node_id}#garden`") Открыть свой огород
      p Открыто {{ state.garden.unlocked }} из 10. Свободный бюджет огорода: {{ state.garden.available_budget }} Cr.
      p Базовая цена грядки: {{ state.garden.base_price }} Cr. Условия приобретённого огорода сохраняются при изменении предложения поселения.
      ol.garden-beds
        li(v-for="bed in state.garden.beds" :key="bed.node_id" :class="{ 'garden-locked': !bed.unlocked }")
          router-link(:to="`/world/nodes/${bed.node_id}`") Грядка {{ bed.ordinal }}
          span {{ bed.unlocked ? 'Открыта' : 'Закрыта' }}
          span(v-if="!bed.unlocked") Цена открытия: {{ bed.price }} Cr
      template(v-if="state.can_expand")
        label Количество следующих грядок
          n-input-number(v-model:value="quantity" :min="1" :max="10 - state.garden.unlocked" :precision="0" :disabled="locked")
        n-checkbox(v-model:checked="topUp" :disabled="locked") Пополнить недостающую сумму с личного баланса
        n-button(:disabled="locked || calculating" @click="preview('expand')") Рассчитать открытие
      p(v-else-if="state.garden.unlocked === 10") Все грядки открыты. Повторно оплачивать их не нужно.
    template(v-else-if="state.offer")
      h3 {{ state.offer.name }}
      p Цена огорода: {{ state.offer.price }} Cr. Грядки 2–10: от {{ state.offer.base_price }} Cr, каждая следующая дороже на эту сумму.
      template(v-if="state.can_buy")
        p Оплата из бюджета этой стоянки. Получатель — казна поселения «{{ state.settlement_name }}».
        n-checkbox(v-model:checked="topUp" :disabled="locked") Пополнить недостающую сумму с личного баланса
        n-button(:disabled="locked || calculating" @click="preview('buy')") Рассчитать покупку
      p(v-else) Покупка доступна на собственной стартовой стоянке после включения экономики и хранения мира.
    p(v-else) Поселение ещё не опубликовало предложение огорода.
    details(v-if="state.can_publish")
      summary Предложение поселения
      p Новые цены действуют для последующих покупок. У уже купленных огородов цена расширения сохраняется.
      label Название
        n-input(v-model:value="form.name" :maxlength="120" :disabled="locked")
      label Цена огорода, Cr
        n-input(v-model:value="form.price" inputmode="decimal" :maxlength="20" :disabled="locked")
      label Базовая цена открытия грядки, Cr
        n-input(v-model:value="form.base_price" inputmode="decimal" :maxlength="20" :disabled="locked")
      n-button(:disabled="locked || calculating" @click="preview('publish')") Рассчитать публикацию
      n-button(v-if="state.offer" :disabled="locked || calculating" @click="preview('withdraw')") Снять предложение
    section(v-if="quote" aria-live="polite")
      h3 {{ labels[quote.action] }}
      template(v-if="quote.payment")
        world-expansion-cost(:prices="quote.unitPrices" :payment="quote.payment" place-label="Грядка")
        p Покупка и пополнение выполняются вместе. Купленные права постоянны; сброс, возврат и перенос огорода пока недоступны.
      template(v-else-if="quote.action === 'publish'")
        p {{ quote.input.name }}: огород {{ quote.input.price }} Cr, базовая цена грядки {{ quote.input.base_price }} Cr.
      p(v-else) Новые покупки по предложению прекратятся. Купленные огороды и их расширения сохранятся.
      n-button(type="primary" :disabled="locked" @click="confirm") {{ quote.payment ? 'Подтвердить оплату' : 'Подтвердить' }}
</template>
<style scoped>
.world-garden { display: grid; gap: .75rem; }
.garden-beds { padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .75rem; }
.garden-beds li, details { display: grid; gap: .5rem; padding: .75rem; border: 1px solid var(--border); border-radius: .4rem; }
.garden-locked { color: var(--text-muted); }
label { display: grid; gap: .3rem; margin-block: .75rem; max-width: 32rem; }
</style>

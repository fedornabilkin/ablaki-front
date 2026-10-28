<script setup lang="ts">
import WorldCredits from '@/components/pages/world/WorldCredits.vue';
import WorldPaymentSources from './WorldPaymentSources.vue';
import { worldActionButtonTheme } from '@/entities/world/theme';
import WorldCreditInput from './WorldCreditInput.vue';
import { discountedCredits, formatCredits, creditCost, needsPersonalTopUp } from '@/entities/world/credits';
import { computed, onScopeDispose, reactive, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NCheckbox, NInput, NInputNumber, NSpin } from 'naive-ui';
import { useRoute } from 'vue-router';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadGarden, previewGarden, type GardenAction } from '@/services/api/worldGarden';
import { worldError } from '@/services/api/world';
import WorldExpansionCost from './WorldExpansionCost.vue';
const props = defineProps<{ nodeId: number; session: number; writable: boolean; command: WorldCommandRunner; existingOnly?: boolean }>();
const route = useRoute(), panel = ref<HTMLElement | null>(null);
const state = shallowRef<Awaited<ReturnType<typeof loadGarden>> | null>(null), quote = shallowRef<Awaited<ReturnType<typeof previewGarden>> | null>(null);
const form = reactive({ name: '', price: '', base_price: '' });
const topUp = ref(false), quantity = ref<number | null>(1), error = ref(''), loading = ref(false), calculating = ref(false), { busy, pending } = props.command;
const locked = computed(() => busy.value || Boolean(pending.value) || !props.writable);
const expansionPrice = computed(() => {
  const garden = state.value?.garden, count = quantity.value;
  if (!garden || !count || !Number.isSafeInteger(count) || count < 1 || count > 10 - garden.unlocked) return null;
  return discountedCredits(garden.beds.filter(bed => !bed.unlocked).slice(0, count).map(bed => bed.price), count >= 3 ? 500 : 0);
});
const needsTopUp = computed(() => expansionPrice.value !== null && state.value?.garden && BigInt(expansionPrice.value.replace('.', '')) > BigInt(state.value.garden.available_budget.replace('.', '')));
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
watch([() => route.hash, state, error], () => { if (!disposed && route.hash === '#garden') panel.value?.scrollIntoView({ block: 'start' }); }, { flush: 'post' });
async function preview(action: GardenAction) {
  if (locked.value || calculating.value) return;
  if (action === 'expand' && needsTopUp.value && !topUp.value) return;
  const expectedPrice = action === 'buy' ? state.value?.offer?.price : action === 'expand' ? expansionPrice.value : null;
  if ((action === 'buy' || action === 'expand') && !expectedPrice) return;
  clear(); const current = previewGeneration; calculating.value = true; error.value = '';
  try {
    const result = await previewGarden(props.nodeId, action, action === 'publish' ? { ...form } : action === 'withdraw' ? {} : { top_up: topUp.value, quantity: quantity.value });
    if (!disposed && current === previewGeneration) {
      if (action === 'buy' || action === 'expand') {
        if (result.payment?.total !== expectedPrice) { error.value = 'Цена изменилась. Обновите огород и проверьте стоимость.'; return; }
        await props.command.submit(`/nodes/${props.nodeId}/garden-${action}`, result.input, result.quote);
        if (!disposed && !pending.value && !props.command.error.value) void load();
      } else quote.value = result;
    }
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
section.world-garden#garden(v-if="!existingOnly || state?.garden || loading || error" ref="panel")
  h2 Открытие грядок
  p В огороде десять грядок: первая включена в покупку. Открывайте остальные и выращивайте урожай. При открытии трёх и более грядок — скидка 5%.
  n-button(:theme-overrides="worldActionButtonTheme" :loading="loading" :disabled="busy || Boolean(pending)" @click="load") Обновить огород
  n-alert(closable v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка огорода")
  template(v-else-if="state")
    template(v-if="state.garden")
      router-link(v-if="state.garden.node_id !== nodeId" :to="`/world/nodes/${state.garden.node_id}#garden`") Открыть свой огород
      p Открыто {{ state.garden.unlocked }} из 10. Свободный бюджет огорода: #[world-credits(:value="state.garden.available_budget")] .
      p Базовая цена грядки: #[world-credits(:value="state.garden.base_price")] . Условия приобретённого огорода сохраняются при изменении предложения поселения.
      section.garden-unlock(v-if="state.can_expand" aria-label="Открыть закрытые грядки")
        h3 Открыть закрытые грядки
        p Грядки открываются по порядку. Выберите количество и нажмите «Открыть». Оплата — из бюджета огорода; если денег не хватает, разрешите пополнение с личного баланса.
        label Количество следующих грядок
          n-input-number(v-model:value="quantity" :min="1" :max="10 - state.garden.unlocked" :precision="0" :disabled="locked")
        world-payment-sources(v-model:checked="topUp" :price="expansionPrice" :available="state.garden?.available_budget" :disabled="locked")
        n-alert(closable v-if="needsTopUp && !topUp" type="warning")
          p В бюджете огорода недостаточно средств. Пополните его или включите пополнение с личного баланса выше.
          router-link(:to="`/world/nodes/${nodeId}#finance`") Пополнить бюджет огорода →
        n-button(:theme-overrides="worldActionButtonTheme" type="primary" :disabled="locked || calculating || !expansionPrice || (needsTopUp && !topUp)" @click="preview('expand')") Открыть {{ quantity }}#[world-credits(:value="expansionPrice ?? '0'" cost)]
      p(v-else-if="state.garden.unlocked === 10") Все грядки открыты. Повторно оплачивать их не нужно.
      p(v-else-if="state.garden.node_id === nodeId") Открытие грядок сейчас недоступно. Обновите огород, чтобы проверить доступность.
      ol.garden-beds
        li(v-for="bed in state.garden.beds" :key="bed.node_id" :class="{ 'garden-locked': !bed.unlocked }")
          font-awesome-icon(:icon="bed.unlocked ? 'seedling' : 'lock'" aria-hidden="true")
          router-link(:to="`/world/nodes/${bed.node_id}#cultivation`") Грядка {{ bed.ordinal }}
          router-link(v-if="bed.unlocked" :to="`/world/nodes/${bed.node_id}#cultivation`") Выращивать
          span {{ bed.unlocked ? 'Открыта' : 'Закрыта' }}
          span(v-if="!bed.unlocked") Цена открытия: #[world-credits(:value="bed.price")]
    template(v-else-if="state.offer")
      font-awesome-icon(icon="seedling" aria-hidden="true")
      h3 {{ state.offer.name }}
      p Цена огорода: #[world-credits(:value="state.offer.price")] . Цена первой дополнительной грядки — #[world-credits(:value="state.offer.base_price")] , затем стоимость каждой следующей растёт на 20%.
      p(v-if="state.can_buy") В бюджете усадьбы доступно: #[world-credits(:value="state.site_budget_available ?? '0.0000'")] .
      n-alert(closable v-if="state.can_buy && state.offer.can_afford === false" type="warning")
        span Пополните бюджет усадьбы перед покупкой.
        router-link(:to="{ path: `/world/nodes/${nodeId}`, hash: '#finance' }") Пополнить бюджет
      template(v-if="state.can_buy")
        p Оплата из бюджета этой стоянки. Получатель — казна поселения «{{ state.settlement_name }}».
        world-payment-sources(v-model:checked="topUp" :price="state.offer.price" :available="state.site_budget_available" :disabled="locked")
        n-button(:theme-overrides="worldActionButtonTheme" type="primary" :disabled="locked || calculating || (!topUp && state.offer.can_afford === false)" @click="preview('buy')") Купить огород#[world-credits(:value="state.offer.price ?? '0'" cost)]
      p(v-else) Покупка доступна на собственной стартовой стоянке после включения экономики и хранения мира.
    p(v-else) Поселение ещё не опубликовало предложение огорода.
    details(v-if="state.can_publish")
      summary Предложение поселения
      p Новые цены действуют для последующих покупок. У уже купленных огородов цена расширения сохраняется.
      label Название
        n-input(v-model:value="form.name" :maxlength="120" :disabled="locked")
      label Цена огорода, кредиты
        world-credit-input(v-model:value="form.price" inputmode="decimal" :maxlength="20" :disabled="locked")
      label Базовая цена открытия грядки, кредиты
        world-credit-input(v-model:value="form.base_price" inputmode="decimal" :maxlength="20" :disabled="locked")
      n-button(:theme-overrides="worldActionButtonTheme" :disabled="locked || calculating" @click="preview('publish')") Рассчитать публикацию
      n-button(:theme-overrides="worldActionButtonTheme" v-if="state.offer" :disabled="locked || calculating" @click="preview('withdraw')") Снять предложение
    section(v-if="quote" aria-live="polite")
      h3 {{ labels[quote.action] }}
      template(v-if="quote.payment")
        world-expansion-cost(:prices="quote.unitPrices" :payment="quote.payment" place-label="Грядка")
        p Покупка и пополнение выполняются вместе. Купленные права постоянны; сброс, возврат и перенос огорода пока недоступны.
      template(v-else-if="quote.action === 'publish'")
        p {{ quote.input.name }}: огород #[world-credits(:value="quote.input.price")] , базовая цена грядки #[world-credits(:value="quote.input.base_price")] .
      p(v-else) Новые покупки по предложению прекратятся. Купленные огороды и их расширения сохранятся.
      n-button(:theme-overrides="worldActionButtonTheme" type="primary" :disabled="locked" @click="confirm") {{ quote.payment ? 'Подтвердить оплату' : 'Подтвердить' }}
</template>
<style scoped>
.world-garden { display: grid; gap: .75rem; scroll-margin-top: 5rem; }
.garden-beds { padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .75rem; }
.garden-beds li, details { display: grid; gap: .5rem; padding: .75rem; border: 1px solid var(--border); border-radius: .4rem; }
.garden-locked { color: var(--text-muted); }
.garden-unlock { display: grid; gap: .75rem; padding: 1rem; border: 1px solid var(--border); border-radius: .4rem; }
label { display: grid; gap: .3rem; margin-block: .75rem; max-width: 32rem; }
</style>

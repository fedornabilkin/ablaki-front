<script setup lang="ts">
import WorldCredits from '@/components/pages/world/WorldCredits.vue';
import { worldActionButtonTheme } from '@/entities/world/theme';
import WorldCreditInput from './WorldCreditInput.vue';
import { formatCredits } from '@/entities/world/credits';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NInput, NInputNumber } from 'naive-ui';
import { previewBudgetGrant } from '@/services/api/worldEconomy';
import { worldError } from '@/services/api/world';
import type { WorldNode } from '@/entities/world/types';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import WorldHelpHint from './WorldHelpHint.vue';
import WorldPaymentSources from './WorldPaymentSources.vue';

const props = defineProps<{ nodeId: number; children: WorldNode[]; session: number; command: WorldCommandRunner }>();
const destination = ref<number | null>(null), amount = ref(''), purpose = ref('');
const quote = shallowRef<Awaited<ReturnType<typeof previewBudgetGrant>> | null>(null);
const calculating = ref(false), error = ref('');
const receipt = ref<{amount: string; destination: number} | null>(null);
const options = computed(() => props.children.filter(child => child.permissions.storage && child.status === 'active' && child.has_finances !== false && !['ROOM', 'BED'].includes(child.type) && child.details.building_kind !== 'warehouse'));
let generation = 0;
watch([() => props.nodeId, () => props.session, destination, amount, purpose], () => { generation++; quote.value = null; receipt.value = null; error.value = ''; });
onScopeDispose(() => { generation++; });
async function preview() {
  if (!destination.value || calculating.value || props.command.pending.value) return;
  const current = ++generation; calculating.value = true; error.value = '';
  try {
    const result = await previewBudgetGrant(props.nodeId, destination.value, amount.value, purpose.value);
    if (current === generation) quote.value = result;
  } catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) calculating.value = false; }
}
async function confirm() {
  if (!quote.value || props.command.busy.value || props.command.pending.value) return;
  const accepted = quote.value, current = generation;
  const result = await props.command.submit(`/nodes/${props.nodeId}/budget-grant`, accepted.input, accepted.quote);
  if (result && current === generation) { quote.value = null; receipt.value = {amount: accepted.input.amount, destination: accepted.input.destination_node_id}; }
}
</script>
<template lang="pug">
section.world-budget-grant#budget-grant(aria-label="Перевод в бюджет дочернего объекта")
  h3 Направить бюджет дочернему объекту
  world-help-hint(label="Как работает перевод в дочерний бюджет")
    p Кредиты переходят из свободной части бюджета этого объекта в бюджет выбранной дочерней ноды. Казна и личный баланс не затрагиваются; обратный перевод автоматически не выполняется.
  p Перевод поступит прямо в бюджет принадлежащего вам объекта или огорода. Казна и личный баланс не меняются.
  n-alert(closable v-if="error" type="error" role="alert") {{ error }}
  n-alert(v-if="receipt" type="success" closable @close="receipt = null") Переведено #[world-credits(:value="receipt.amount")] в бюджет объекта №{{ receipt.destination }}.
  n-button(v-if="receipt" @click="receipt = null") Новый перевод
  .grant-options(v-if="!receipt && options.length")
    span Быстрый выбор:
    n-button(:theme-overrides="worldActionButtonTheme" v-for="child in options" :key="child.id" size="small" @click="destination = child.id") {{ child.label }} · №{{ child.id }}
  label(v-if="!receipt") ID получателя
    n-input-number(v-model:value="destination" :min="1" :max="2147483647" :precision="0" placeholder="Дочерний объект или свой огород")
  label(v-if="!receipt") Сумма
    world-credit-input(v-model:value="amount" inputmode="decimal" placeholder="10" :maxlength="20")
  label(v-if="!receipt") Назначение
    n-input(v-model:value="purpose" :maxlength="255" placeholder="На развитие объекта")
  n-button(v-if="!receipt" :theme-overrides="worldActionButtonTheme" :loading="calculating" :disabled="!destination || !amount || !purpose.trim() || Boolean(command.pending.value)" @click="preview") Рассчитать перевод
  section.grant-quote(v-if="quote" aria-live="polite")
    world-payment-sources(mode="budget" :price="quote.input.amount")
    p Перевод: #[world-credits(:value="quote.input.amount")]  объекту №{{ quote.input.destination_node_id }}.
    p В источнике останется свободно #[world-credits(:value="quote.sourceAvailableAfter")] ; бюджет получателя станет #[world-credits(:value="quote.destinationBudgetAfter")] .
    n-button(:theme-overrides="worldActionButtonTheme" type="primary" :loading="command.busy.value" :disabled="Boolean(command.pending.value)" @click="confirm") Подтвердить перевод
</template>
<style scoped>
.world-budget-grant { display: grid; gap: .75rem; padding: 1rem; border: 1px solid var(--border); border-radius: .6rem; }
.world-budget-grant label { display: grid; gap: .3rem; max-width: 34rem; }
.grant-options { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.grant-quote { padding: 1rem; border: 1px solid var(--primary); border-radius: .5rem; }
</style>

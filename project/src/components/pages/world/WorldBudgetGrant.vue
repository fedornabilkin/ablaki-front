<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NInput, NInputNumber } from 'naive-ui';
import { previewBudgetGrant } from '@/services/api/worldEconomy';
import { worldError } from '@/services/api/world';
import type { WorldNode } from '@/entities/world/types';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';

const props = defineProps<{ nodeId: number; children: WorldNode[]; session: number; command: WorldCommandRunner }>();
const destination = ref<number | null>(null), amount = ref(''), purpose = ref('');
const quote = shallowRef<Awaited<ReturnType<typeof previewBudgetGrant>> | null>(null);
const calculating = ref(false), error = ref('');
const options = computed(() => props.children.filter(child => child.permissions.storage && child.status === 'active'));
let generation = 0;
watch([() => props.nodeId, () => props.session, destination, amount, purpose], () => { generation++; quote.value = null; error.value = ''; });
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
function confirm() {
  if (quote.value) void props.command.submit(`/nodes/${props.nodeId}/budget-grant`, quote.value.input, quote.value.quote);
}
</script>
<template lang="pug">
section.world-budget-grant#budget-grant(aria-label="Перевод в бюджет дочернего объекта")
  h3 Направить бюджет дочернему объекту
  p Перевод поступит прямо в бюджет принадлежащего вам объекта или огорода. Казна и личный баланс не меняются.
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  .grant-options(v-if="options.length")
    span Быстрый выбор:
    n-button(v-for="child in options" :key="child.id" size="small" @click="destination = child.id") {{ child.name }} · №{{ child.id }}
  label ID получателя
    n-input-number(v-model:value="destination" :min="1" :max="2147483647" :precision="0" placeholder="Дочерний объект или свой огород")
  label Сумма, Cr
    n-input(v-model:value="amount" inputmode="decimal" placeholder="10.0000" :maxlength="20")
  label Назначение
    n-input(v-model:value="purpose" :maxlength="255" placeholder="На развитие объекта")
  n-button(:loading="calculating" :disabled="!destination || !amount || !purpose.trim() || Boolean(command.pending.value)" @click="preview") Рассчитать перевод
  section.grant-quote(v-if="quote" aria-live="polite")
    p Перевод: {{ quote.input.amount }} Cr объекту №{{ quote.input.destination_node_id }}.
    p В источнике останется свободно {{ quote.sourceAvailableAfter }} Cr; бюджет получателя станет {{ quote.destinationBudgetAfter }} Cr.
    n-button(type="primary" :loading="command.busy.value" :disabled="Boolean(command.pending.value)" @click="confirm") Подтвердить перевод
</template>
<style scoped>
.world-budget-grant { display: grid; gap: .75rem; padding: 1rem; border: 1px solid var(--border); border-radius: .6rem; }
.world-budget-grant label { display: grid; gap: .3rem; max-width: 34rem; }
.grant-options { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.grant-quote { padding: 1rem; border: 1px solid var(--primary); border-radius: .5rem; }
</style>

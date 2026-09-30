<script setup lang="ts">
import { onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NInput, NSpin } from 'naive-ui';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { worldError } from '@/services/api/world';
import { loadNodeEconomy, previewInvestment } from '@/services/api/worldEconomy';
import { investmentAmount } from '@/entities/world/credits';
import type { WorldNode } from '@/entities/world/types';
import WorldTreasuryPanel from './WorldTreasuryPanel.vue';
import WorldBudgetGrant from './WorldBudgetGrant.vue';
import WorldTreasuryReceipts from './WorldTreasuryReceipts.vue';
import WorldFinanceReport from './WorldFinanceReport.vue';
const props = defineProps<{ nodeId: number; children: WorldNode[]; session: number; command: WorldCommandRunner }>();
const state = shallowRef<Awaited<ReturnType<typeof loadNodeEconomy>> | null>(null), quote = shallowRef<Awaited<ReturnType<typeof previewInvestment>> | null>(null);
const amount = ref(''), purpose = ref('Развитие объекта'), error = ref(''), loading = ref(false), calculating = ref(false);
const { busy, pending } = props.command;
const money = (value: string | number) => `${new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(value))} Cr`;
let generation = 0, previewGeneration = 0, disposed = false;
async function load() {
  const current = ++generation; previewGeneration++; quote.value = null; state.value = null; loading.value = true; calculating.value = false; error.value = '';
  try { const result = await loadNodeEconomy(props.nodeId, 1); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session], load, { immediate: true, flush: 'sync' });
watch([amount, purpose], () => { previewGeneration++; quote.value = null; calculating.value = false; }, { flush: 'sync' });
async function preview() {
  if (!state.value?.can_invest || busy.value || pending.value) return;
  error.value = ''; quote.value = null;
  try { investmentAmount(amount.value); if (!purpose.value.trim()) throw new Error('purpose-required'); }
  catch { error.value = 'Укажите положительную сумму, до четырёх знаков после точки, и назначение.'; return; }
  const current = ++previewGeneration; calculating.value = true;
  try { const result = await previewInvestment(props.nodeId, amount.value, purpose.value); if (!disposed && current === previewGeneration) quote.value = result; }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
function invest() { if (quote.value && state.value?.can_invest && !busy.value && !pending.value) void props.command.submit(`/nodes/${props.nodeId}/invest`, { ...quote.value.input }, quote.value.quote); }
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.world-economy
  h2 Бюджет и казна
  n-button(:loading="loading" :disabled="busy" @click="load") Обновить счета
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка счетов")
  template(v-else-if="state")
    dl(v-if="state.balances")
      dt Бюджет
      dd {{ money(state.balances.budget) }}
      dt Зарезервировано
      dd {{ money(state.balances.reserved) }}
      dt Доступно на развитие
      dd {{ money(state.balances.available) }}
      dt Казна — несобранные поступления
      dd {{ money(state.balances.treasury) }}
    p(v-else) Детали счетов доступны владельцу объекта.
    n-alert(v-if="!state.wallet_ready" type="info") Денежные операции мира ещё не открыты.
    template(v-if="state.balances")
      n-alert(v-if="state.catching_up" type="info") Расчёт потерь за прошедшее время ещё не завершён. Обновите данные немного позже, чтобы собрать казну.
      p(v-if="state.rule?.status === 'published'") Отчисления: {{ (state.rule.rate_bps ?? 0) / 100 }}% собранного дохода. Правило №{{ state.rule.revision }}.
      p(v-else) Правила отчислений и защиты казны ещё не опубликованы. Сбор дохода пока закрыт.
      p(v-if="state.rule?.loss") Новые поступления защищены {{ state.rule.loss.protected_seconds / 3600 }} ч. Затем каждые {{ state.rule.loss.period_seconds / 3600 }} ч теряется {{ state.rule.loss.rate_bps / 100 }}% остатка. Для прежних поступлений сохраняются их условия.
      world-treasury-panel(:node-id="nodeId" :session="session" :can-collect="state.can_collect" :can-pay="state.can_pay" :command="command")
      world-treasury-receipts(:node-id="nodeId" :session="session")
    template(v-if="state.can_invest")
      h3 Вложить личные кредиты
      p Взнос поступит в бюджет этого объекта. Автоматический возврат и вывод на личный счёт не предусмотрены.
      label Сумма в Cr
        n-input(v-model:value="amount" placeholder="10.0000" :maxlength="20" :disabled="busy || Boolean(pending)" inputmode="decimal")
      label Назначение
        n-input(v-model:value="purpose" :maxlength="255" :disabled="busy || Boolean(pending)")
      n-button(:loading="calculating" :disabled="busy || Boolean(pending)" @click="preview") Рассчитать взнос
      section(v-if="quote" aria-live="polite")
        p В бюджет «{{ quote.name }}»: {{ money(quote.amount) }}
        p Личный баланс: {{ money(quote.wallet_before) }} → {{ money(quote.wallet_after) }}
        n-button(type="primary" :loading="busy" :disabled="Boolean(pending)" @click="invest") Подтвердить вложение
    world-budget-grant(v-if="state.can_grant" :node-id="nodeId" :children="children" :session="session" :command="command")
    template(v-if="state.balances")
      world-finance-report(:node-id="nodeId" :session="session")
</template>
<style scoped>
.world-economy { display: grid; gap: .75rem; border: 1px solid var(--border); border-radius: .5rem; padding: 1rem; }
dl { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .5rem 1rem; margin: 0; }
dd { margin: 0; overflow-wrap: anywhere; } label { display: grid; gap: .3rem; }
</style>

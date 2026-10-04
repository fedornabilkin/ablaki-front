<script setup lang="ts">
import { formatCredits } from '@/entities/world/credits';
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
import WorldHelpHint from './WorldHelpHint.vue';
const props = defineProps<{ nodeId: number; children: WorldNode[]; session: number; command: WorldCommandRunner }>();
const state = shallowRef<Awaited<ReturnType<typeof loadNodeEconomy>> | null>(null), quote = shallowRef<Awaited<ReturnType<typeof previewInvestment>> | null>(null);
const amount = ref(''), purpose = ref('Развитие объекта'), error = ref(''), loading = ref(false), calculating = ref(false);
const { busy, pending } = props.command;
const money = (value: string | number) => `${formatCredits(value)} Cr`;
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
  .finance-toolbar
    h3 Счета объекта
    n-button(size="small" :loading="loading" :disabled="busy" @click="load") Обновить
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка счетов")
  template(v-else-if="state")
    section.finance-summary.world-content-card(v-if="state.balances")
      .finance-summary-heading
        h4 Остатки и условия
        world-help-hint(label="Разница между бюджетом, резервом и казной")
          p Бюджет предназначен для расходов объекта. Зарезервированные кредиты уже нужны для обязательств, поэтому на развитие доступен остаток после резерва. Казна хранит ещё не собранные поступления; личный баланс владельца учитывается отдельно.
      dl(v-if="state.balances")
        dt Бюджет
        dd {{ money(state.balances.budget) }}
        dt Зарезервировано
        dd {{ money(state.balances.reserved) }}
        dt Доступно на развитие
        dd {{ money(state.balances.available) }}
        dt Казна · не собрано
        dd {{ money(state.balances.treasury) }}
      n-alert(v-if="state.catching_up" type="info") Расчёт потерь за прошедшее время ещё не завершён. Обновите данные немного позже, чтобы собрать казну.
      p(v-if="state.rule?.status === 'published'") Отчисления: {{ (state.rule.rate_bps ?? 0) / 100 }}% собранного дохода. Правило №{{ state.rule.revision }}.
      p(v-else) Правила отчислений и защиты казны ещё не опубликованы. Сбор дохода пока закрыт.
      p(v-if="state.rule?.loss") Новые поступления защищены {{ state.rule.loss.protected_seconds / 3600 }} ч. Затем каждые {{ state.rule.loss.period_seconds / 3600 }} ч теряется {{ state.rule.loss.rate_bps / 100 }}% остатка. Для прежних поступлений сохраняются их условия.
    p(v-else) Детали счетов доступны владельцу объекта.
    n-alert(v-if="!state.wallet_ready" type="info") Денежные операции мира ещё не открыты.
    .world-finance-grid
      world-treasury-panel.world-finance-card.world-finance-card--wide(v-if="state.balances" :node-id="nodeId" :session="session" :can-collect="state.can_collect" :can-pay="state.can_pay" :command="command")
      world-treasury-receipts.world-finance-card.world-finance-card--wide(v-if="state.balances" :node-id="nodeId" :session="session")
      template(v-if="state.can_invest")
        section.world-finance-card
          .finance-summary-heading
            h4 Вложить личные кредиты
            world-help-hint(label="Как пополнить бюджет личными кредитами")
              p Подтверждённый перевод списывает указанную сумму с личного баланса и зачисляет её в бюджет объекта. Это вложение не возвращается автоматически и не попадает в казну.
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
      world-budget-grant.world-finance-card(v-if="state.can_grant" :node-id="nodeId" :children="children" :session="session" :command="command")
      world-finance-report.world-finance-card.world-finance-card--wide(v-if="state.balances" :node-id="nodeId" :session="session")
</template>
<style scoped>
.world-economy { display: grid; gap: 1rem; min-width: 0; }
.finance-toolbar, .finance-summary-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .6rem 1rem; }
.finance-toolbar h3, .finance-summary-heading h4 { margin: 0; }
.finance-summary { display: grid; gap: .75rem; }
.finance-summary dl { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .5rem 1rem; margin: 0; }
.finance-summary dt { color: var(--text-muted); }
.finance-summary dd { margin: 0; font-weight: 650; font-variant-numeric: tabular-nums; }
.world-finance-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .9rem; align-items: start; }
.world-finance-card { min-width: 0; padding: 1rem; border: 1px solid var(--border); border-radius: .75rem; background: var(--bg-surface); }
.world-finance-card--wide { grid-column: 1 / -1; }
.world-finance-card label { display: grid; gap: .3rem; margin-block: .65rem; }
@media (max-width: 760px) { .world-finance-grid { grid-template-columns: 1fr; } .world-finance-card--wide { grid-column: auto; } }
dl { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .5rem 1rem; margin: 0; }
dd { margin: 0; overflow-wrap: anywhere; } label { display: grid; gap: .3rem; }
</style>

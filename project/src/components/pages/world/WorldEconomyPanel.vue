<script setup lang="ts">
import WorldSectionHeading from './WorldSectionHeading.vue';
import WorldPanel from './WorldPanel.vue';
import WorldStat from './WorldStat.vue';
import WorldActionBar, { type WorldAction } from './WorldActionBar.vue';
import WorldDisclosure from './WorldDisclosure.vue';
import AppDialog from '@/components/AppDialog.vue';
import WorldCredits from '@/components/pages/world/WorldCredits.vue';
import { worldActionButtonTheme, worldNeutralButtonTheme } from '@/entities/world/theme';
import WorldCreditInput from './WorldCreditInput.vue';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';
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
import WorldPaymentSources from './WorldPaymentSources.vue';
const props = defineProps<{ nodeId: number; children: WorldNode[]; session: number; command: WorldCommandRunner; canConfigure?: boolean }>();
const route = useRoute();
const operationForHash = () => route.hash === '#budget-grant' ? 'grant' : 'treasury';
const state = shallowRef<Awaited<ReturnType<typeof loadNodeEconomy>> | null>(null), quote = shallowRef<Awaited<ReturnType<typeof previewInvestment>> | null>(null);
const amount = ref(''), purpose = ref('Развитие объекта'), error = ref(''), loading = ref(false), calculating = ref(false);
const receipt = ref<{ amount: string; available: string | null } | null>(null);
const reportOpen = ref(route.hash === '#finance-report');
const operation = ref(operationForHash());
const operations = computed<WorldAction[]>(() => [
  { id: 'treasury', label: 'Доходы и выплаты', icon: 'coins', hint: 'Сбор доходов и оплата обязательств объекта.' },
  ...(state.value?.can_invest ? [{ id: 'invest', label: 'Пополнить', icon: 'plus', hint: 'Вложение личных кредитов в бюджет объекта.' }] : []),
  ...(state.value?.can_grant ? [{ id: 'grant', label: 'Передать', icon: 'exchange-alt', hint: 'Передача бюджета дочернему объекту.' }] : []),
  ...(props.canConfigure ? [{ id: 'policy', label: 'Правила', icon: 'cog', hint: 'Условия отчислений и защиты казны.' }] : []),
].map(item => ({ ...item, active: item.id === operation.value })));
watch(operations, items => { if (state.value && !items.some(item => item.id === operation.value)) operation.value = 'treasury'; });
watch(() => route.hash, hash => { if (hash === '#budget-grant') operation.value = 'grant'; if (hash === '#finance-report') reportOpen.value = true; });
const { busy, pending } = props.command;
let generation = 0, previewGeneration = 0, disposed = false;
async function load() {
  const current = ++generation; previewGeneration++; quote.value = null; state.value = null; loading.value = true; calculating.value = false; error.value = '';
  try { const result = await loadNodeEconomy(props.nodeId, 1); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session], () => { receipt.value = null; reportOpen.value = route.hash === '#finance-report'; operation.value = operationForHash(); void load(); }, { immediate: true, flush: 'sync' });
watch([amount, purpose], () => { previewGeneration++; quote.value = null; receipt.value = null; calculating.value = false; }, { flush: 'sync' });
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
async function invest() {
  if (!quote.value || !state.value?.can_invest || busy.value || pending.value) return;
  const accepted = quote.value, current = generation, paid = amount.value;
  const result = await props.command.submit(`/nodes/${props.nodeId}/invest`, { ...accepted.input }, accepted.quote);
  if (!result || disposed || current !== generation) return;
  quote.value = null; await load();
  if (!disposed && current + 1 === generation) receipt.value = { amount: paid, available: state.value?.balances?.available ?? null };
}
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.world-economy(aria-label="Финансы объекта")
  world-section-heading.finance-toolbar(title="Финансы" icon="coins")
    n-button.finance-tool(v-if="state?.balances" :theme-overrides="worldNeutralButtonTheme" aria-label="Финансовый отчёт" title="Финансовый отчёт" @click="reportOpen = true")
      template(#icon)
        font-awesome-icon(icon="scroll" aria-hidden="true")
      span Отчёт
    n-button.finance-tool(:theme-overrides="worldNeutralButtonTheme" :loading="loading" :disabled="busy || !!pending" aria-label="Обновить счета" title="Обновить счета" @click="load")
      template(#icon)
        font-awesome-icon(icon="rotate" aria-hidden="true")
      span Обновить
  n-alert(closable v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка счетов")
  template(v-else-if="state")
    n-alert(closable v-if="!state.wallet_ready" type="info") Денежные операции мира ещё не открыты.
    .world-finance-grid(v-if="state.balances")
      world-panel.finance-summary
        world-section-heading(title="Средства объекта" icon="coins" level="h3")
          world-help-hint(label="Бюджет, резерв и казна")
            p Бюджет предназначен для расходов объекта. Резерв уже нужен для обязательств. На развитие доступен остаток после резерва. Казна хранит ещё не собранные поступления; личный баланс учитывается отдельно.
            p(v-if="state.rule?.status === 'published'") Отчисления: {{ (state.rule.rate_bps ?? 0) / 100 }}% собранного дохода. Правило №{{ state.rule.revision }}.
            p(v-else) Правила отчислений и защиты казны ещё не опубликованы. Сбор дохода пока закрыт.
            p(v-if="state.treasury_enabled && state.rule?.loss") Новые поступления защищены {{ state.rule.loss.protected_seconds / 3600 }} ч. Затем каждые {{ state.rule.loss.period_seconds / 3600 }} ч теряется {{ state.rule.loss.rate_bps / 100 }}% остатка. Для прежних поступлений сохраняются их условия.
            p(v-if="!state.treasury_enabled") Казна выключена. Новые поступления сразу переходят в бюджет с сохранением отчислений.
        .finance-balances
          world-stat(label="Бюджет" icon="coins")
            world-credits(:value="state.balances.budget")
          world-stat(label="Резерв" icon="lock")
            world-credits(:value="state.balances.reserved")
          world-stat(label="Доступно" icon="check")
            world-credits(:value="state.balances.available")
          world-stat(v-if="state.treasury_enabled || state.balances.treasury !== '0.0000'" label="Казна" icon="box")
            world-credits(:value="state.balances.treasury")
        n-alert(closable v-if="state.catching_up" type="info") Расчёт потерь за прошедшее время ещё не завершён. Обновите данные немного позже, чтобы собрать казну.
        world-disclosure(v-if="state.treasury_enabled || state.balances.treasury !== '0.0000'" :open="route.hash === '#treasury-receipts'" label="Поступления в казну" icon="scroll")
          world-treasury-receipts(:node-id="nodeId" :session="session")
      world-panel.finance-operations
        world-action-bar(label="Финансовые операции" :items="operations" @select="operation = $event")
        world-treasury-panel(v-show="operation === 'treasury'" :treasury-enabled="state.treasury_enabled" :node-id="nodeId" :session="session" :can-collect="state.can_collect" :can-pay="state.can_pay" :command="command")
        section.finance-form(v-if="state.can_invest" v-show="operation === 'invest'" aria-label="Вложение в бюджет")
          world-section-heading(title="Пополнить бюджет" icon="plus" level="h3")
            world-help-hint(label="Вложение личных кредитов")
              p Подтверждённый перевод списывает сумму с личного баланса и зачисляет её в бюджет объекта. Вложение не возвращается автоматически и не попадает в казну.
          n-alert(v-if="receipt" type="success" closable @close="receipt = null")
            p Бюджет пополнен на #[world-credits(:value="receipt.amount")].
            p(v-if="receipt.available !== null") Теперь доступно: #[world-credits(:value="receipt.available")].
          n-button(v-if="receipt" @click="receipt = null") Новый взнос
          label(v-if="!receipt") Сумма
            world-credit-input(v-model:value="amount" placeholder="10" :maxlength="20" :disabled="busy || Boolean(pending)" inputmode="decimal")
          label(v-if="!receipt") Назначение
            n-input(v-model:value="purpose" :maxlength="255" :disabled="busy || Boolean(pending)")
          n-button(v-if="!receipt" :theme-overrides="worldActionButtonTheme" :loading="calculating" :disabled="busy || Boolean(pending)" @click="preview")
            template(#icon)
              font-awesome-icon(icon="coins" aria-hidden="true")
            | Рассчитать взнос
          .finance-confirmation(v-if="quote" aria-live="polite")
            world-payment-sources(mode="personal" :price="quote.amount")
            p В бюджет «{{ quote.name }}»: #[world-credits(:value="quote.amount")]
            p Личный баланс: #[world-credits(:value="quote.wallet_before")] → #[world-credits(:value="quote.wallet_after")]
            n-button(:theme-overrides="worldActionButtonTheme" type="primary" :loading="busy" :disabled="Boolean(pending)" @click="invest") Подтвердить вложение
        world-budget-grant(v-if="state.can_grant" v-show="operation === 'grant'" :node-id="nodeId" :children="children" :session="session" :command="command")
        .finance-policy(v-if="canConfigure" v-show="operation === 'policy'")
          slot
    p(v-else) Детали счетов доступны владельцу объекта.
  app-dialog(icon="scroll" v-model:show="reportOpen" title="Операции объекта" :style="{width: 'min(60rem, 94vw)'}")
    world-finance-report(v-if="reportOpen" :node-id="nodeId" :session="session")
</template>
<style scoped>
.world-economy { display: grid; gap: .75rem; min-width: 0; }
.finance-toolbar { padding-inline: .75rem; }
.finance-tool { min-width: 2.75rem; min-height: 2.75rem; }.finance-tool :deep(.n-button__icon) { margin-right: 0; }.finance-tool :deep(.n-button__content > span) { display: none; }
.world-finance-grid { display: grid; gap: .75rem; align-items: start; min-width: 0; }
.finance-balances { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .6rem; }
.finance-form, .finance-confirmation { display: grid; gap: .75rem; min-width: 0; }
.finance-form label { display: grid; gap: .35rem; max-width: 26rem; font-size: .875rem; }
.finance-confirmation { padding-top: .75rem; border-top: 1px solid var(--border); }
.finance-form .n-button { justify-self: start; max-width: 100%; min-height: 2.75rem; }
.finance-form p { margin: 0; }
.finance-operations > :deep(section), .finance-policy > :deep(section) { min-width: 0; }
@media(max-width: 47.99rem) { .finance-summary, .finance-operations { border-inline: 0; border-radius: 0; } }
@media(min-width: 48rem) { .world-finance-grid { grid-template-columns: minmax(16rem, 1fr) minmax(0, 1.65fr); gap: 1rem; }.finance-toolbar { padding-inline: 0; } }
@media(min-width: 64rem) { .finance-tool :deep(.n-button__content > span) { display: inline; }.finance-tool :deep(.n-button__icon) { margin-right: .4rem; } }
</style>

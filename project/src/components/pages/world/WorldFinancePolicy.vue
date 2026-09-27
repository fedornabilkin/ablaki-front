<script setup lang="ts">
import { onScopeDispose, reactive, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NInput } from 'naive-ui';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { previewFinancePolicy } from '@/services/api/worldEconomy';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; session: number; writable: boolean; command: WorldCommandRunner }>();
// Empty fields are intentional: balance settings have to be chosen explicitly, never silently seeded.
const form = reactive({ rate: '', due: '', protection: '', period: '', loss: '', reason: '' });
const quote = shallowRef<Awaited<ReturnType<typeof previewFinancePolicy>> | null>(null), error = ref(''), calculating = ref(false);
const { busy, pending } = props.command;
let generation = 0, disposed = false;
function reset() { generation++; quote.value = null; error.value = ''; calculating.value = false; }
watch(form, reset, { flush: 'sync' });
watch([() => props.nodeId, () => props.session], () => { reset(); for (const key of Object.keys(form) as (keyof typeof form)[]) form[key] = ''; }, { flush: 'sync' });
watch([() => props.writable, busy], reset, { flush: 'sync' });
const percent = (value: string) => {
  if (!/^(0|[1-9]\d{0,2})(\.\d{1,2})?$/.test(value)) throw new Error('invalid-percent');
  const [whole, fraction = ''] = value.split('.'), result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (result > 10000) throw new Error('invalid-percent');
  return result;
};
const hours = (value: string, min: number, max: number) => {
  if (!/^(0|[1-9]\d{0,3})$/.test(value) || Number(value) < min || Number(value) > max) throw new Error('invalid-hours');
  return Number(value) * 3600;
};
async function preview() {
  if (!props.writable || busy.value || pending.value || calculating.value) return;
  reset();
  let input;
  try {
    input = { rate_bps: percent(form.rate), due_seconds: hours(form.due, 1, 8760), protected_seconds: hours(form.protection, 0, 8760),
      loss_period_seconds: hours(form.period, 1, 720), loss_rate_bps: percent(form.loss), reason: form.reason.trim() };
    if (!input.reason) throw new Error('reason-required');
  } catch { error.value = 'Заполните все поля: проценты от 0 до 100, сроки в целых часах и причину изменения.'; return; }
  const current = generation; calculating.value = true;
  try { const result = await previewFinancePolicy(props.nodeId, input); if (!disposed && generation === current) quote.value = result; }
  catch (cause) { if (!disposed && generation === current) error.value = worldError(cause); }
  finally { if (!disposed && generation === current) calculating.value = false; }
}
function publish() { if (quote.value && props.writable && !busy.value && !pending.value) void props.command.submit(`/nodes/${props.nodeId}/finance-policy`, { ...quote.value.input }, quote.value.quote); }
onScopeDispose(() => { disposed = true; generation++; });
</script>
<template lang="pug">
details.finance-policy
  summary Правила казны и отчислений
  p Новая ставка применяется к последующим сборам. Суммы и получатели существующих обязательств сохраняются. Защита и потери меняются только для новых поступлений.
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  label Отчисления от собранного дохода, % (для корня мира — 0)
    n-input(v-model:value="form.rate" inputmode="decimal" :maxlength="6" :disabled="!writable || busy || Boolean(pending)")
  label Срок оплаты отчислений, ч (1–8760)
    n-input(v-model:value="form.due" inputmode="numeric" :maxlength="4" :disabled="!writable || busy || Boolean(pending)")
  label Защита нового поступления, ч (0–8760)
    n-input(v-model:value="form.protection" inputmode="numeric" :maxlength="4" :disabled="!writable || busy || Boolean(pending)")
  label Период потерь после защиты, ч (1–720)
    n-input(v-model:value="form.period" inputmode="numeric" :maxlength="3" :disabled="!writable || busy || Boolean(pending)")
  label Потери за период, % остатка
    n-input(v-model:value="form.loss" inputmode="decimal" :maxlength="6" :disabled="!writable || busy || Boolean(pending)")
  label Причина изменения
    n-input(v-model:value="form.reason" :maxlength="255" :disabled="!writable || busy || Boolean(pending)")
  n-button(:disabled="!writable || busy || Boolean(pending)" :loading="calculating" @click="preview") Подготовить правило
  section(v-if="quote" aria-live="polite")
    p Будет опубликовано правило №{{ quote.revision }}. Отчисления: {{ quote.input.rate_bps / 100 }}%; срок оплаты — {{ quote.input.due_seconds / 3600 }} ч.
    p Защита — {{ quote.input.protected_seconds / 3600 }} ч; затем потери {{ quote.input.loss_rate_bps / 100 }}% каждые {{ quote.input.loss_period_seconds / 3600 }} ч.
    p(v-if="quote.parent_node_id") Получатель отчислений — объект №{{ quote.parent_node_id }}.
    n-button(type="primary" :disabled="!writable || busy || Boolean(pending)" @click="publish") Опубликовать правило
</template>
<style scoped>
.finance-policy { border: 1px solid var(--border); border-radius: .5rem; padding: 1rem; }
label { display: grid; gap: .3rem; margin-block: .75rem; max-width: 36rem; }
summary { cursor: pointer; }
</style>

<script setup lang="ts">
import { onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSpin } from 'naive-ui';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadObligations, previewCollection, previewPayment } from '@/services/api/worldEconomy';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; session: number; canCollect: boolean; canPay: boolean; command: WorldCommandRunner }>();
const { page } = useListQuery({}, { prefix: 'obligations' });
const state = shallowRef<Awaited<ReturnType<typeof loadObligations>> | null>(null);
const collection = shallowRef<Awaited<ReturnType<typeof previewCollection>> | null>(null);
const payment = shallowRef<Awaited<ReturnType<typeof previewPayment>> | null>(null);
const loading = ref(false), calculating = ref(false), error = ref('');
const { busy, pending } = props.command;
const money = (value: string | number) => `${new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(value))} Cr`;
let generation = 0, previewGeneration = 0, disposed = false;
const date = (seconds: number) => new Date(seconds * 1000).toLocaleString('ru-RU');
function clearPreview() { previewGeneration++; collection.value = null; payment.value = null; calculating.value = false; }
async function load() {
  const current = ++generation; state.value = null; loading.value = true; error.value = ''; clearPreview();
  try { const result = await loadObligations(props.nodeId, page.value); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session, page], load, { immediate: true, flush: 'sync' });
watch([() => props.canCollect, () => props.canPay, busy], clearPreview, { flush: 'sync' });
async function preview(obligation?: number) {
  if (busy.value || pending.value || calculating.value || (obligation === undefined ? !props.canCollect : !props.canPay)) return;
  clearPreview(); const current = previewGeneration; calculating.value = true; error.value = '';
  try {
    if (obligation === undefined) {
      const result = await previewCollection(props.nodeId); if (!disposed && current === previewGeneration) collection.value = result;
    } else {
      const result = await previewPayment(props.nodeId, obligation); if (!disposed && current === previewGeneration) payment.value = result;
    }
  } catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
function collect() {
  if (collection.value && props.canCollect && !busy.value && !pending.value) void props.command.submit(`/nodes/${props.nodeId}/collect`, {}, collection.value.quote);
}
function pay() {
  if (payment.value && props.canPay && !busy.value && !pending.value) void props.command.submit(`/nodes/${props.nodeId}/pay`, { ...payment.value.input }, payment.value.quote);
}
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.world-treasury
  h3 Собрать доход
  details.help-hint
    summary(aria-label="Как работает сбор дохода") ?
    p Собранные поступления переводятся из казны в бюджет объекта, доступный для расходов и развития.
  p При сборе казна пополняет бюджет объекта. Отчисления резервируются в бюджете и оплачиваются отдельным действием.
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-button(:disabled="!canCollect || busy || Boolean(pending)" :loading="calculating" @click="preview()") Рассчитать сбор
  section(v-if="collection" aria-live="polite")
    p В бюджет поступит: {{ money(collection.collected) }}
    p Резерв на отчисления: {{ money(collection.reserved) }}
    p Доступно на развитие после сбора: {{ money(collection.available_after) }}
    p В казне останется: {{ money(collection.treasury_after) }}
    n-alert(v-if="collection.more_pending" type="info") Поступлений много. После подтверждения можно собрать следующую партию.
    n-button(type="primary" :disabled="busy || Boolean(pending) || !canCollect" @click="collect") Подтвердить сбор
  h3 Отчисления родительскому объекту
  details.help-hint
    summary(aria-label="Как работают отчисления родительскому объекту") ?
    p Выполненные выплаты переводят часть бюджета в казну родительского объекта по опубликованным правилам.
  n-spin(v-if="loading" aria-label="Загрузка обязательств")
  template(v-else-if="state")
    p(v-if="!state.items.length") Обязательств пока нет.
    ul.obligations
      li(v-for="item in state.items" :key="item.id")
        p {{ money(item.amount) }} · обязательство №{{ item.id }}
        router-link(:to="`/world/nodes/${item.parent_node_id}`") Получатель — объект №{{ item.parent_node_id }}
        p(v-if="item.paid_at !== null") Оплачено {{ date(item.paid_at) }}
        template(v-else)
          p(:class="{ overdue: item.due_at <= state.server_time }") {{ item.due_at <= state.server_time ? 'Срок оплаты прошёл: ' : 'Оплатить до: ' }}{{ date(item.due_at) }}
          n-button(:disabled="!canPay || busy || Boolean(pending) || calculating" @click="preview(item.id)") Рассчитать оплату
    page-pager(v-model:page="page" query-prefix="obligations" :result="state" :disabled="busy")
  section(v-if="payment" aria-live="polite")
    p Оплата обязательства №{{ payment.input.obligation_id }}: {{ money(payment.amount) }} в казну объекта №{{ payment.parent_node_id }}.
    p В бюджете останется {{ money(payment.budget_after) }}, из них зарезервировано {{ money(payment.reserved_after) }}.
    n-button(type="primary" :disabled="!canPay || busy || Boolean(pending)" @click="pay") Подтвердить оплату
</template>
<style scoped>
.world-treasury { display: grid; gap: .75rem; }
.obligations { list-style: none; padding: 0; display: grid; gap: .75rem; }
.obligations li { border: 1px solid var(--border); border-radius: .4rem; padding: .75rem; }
.overdue { color: var(--color-danger, #c0392b); }
.help-hint { justify-self: start; }
.help-hint summary { display: grid; place-items: center; width: 1.35rem; height: 1.35rem; border: 1px solid var(--border); border-radius: 50%; color: var(--text-muted); cursor: pointer; list-style: none; }
.help-hint summary::-webkit-details-marker { display: none; }
.help-hint p { max-width: 32rem; color: var(--text-muted); font-size: .9rem; }
</style>

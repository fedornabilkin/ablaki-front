<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NCheckbox, NProgress } from 'naive-ui';
import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote, worldError } from '@/services/api/world';
import { formatCredits, creditAmount } from '@/entities/world/credits';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
const props = defineProps<{ nodeId: number; session: number; command: WorldCommandRunner }>();
const state = shallowRef<{ capacity: number; used: number; limit: number; next_price: string | null; finance_node_id: number; writable: boolean } | null>(null);
const error = ref(''), loading = ref(false), topUp = ref(true); let generation = 0, disposed = false;
const locked = computed(() => loading.value || props.command.busy.value || Boolean(props.command.pending.value) || !state.value?.writable);
const url = (suffix = '') => config.makeApiUrl(`v1/world/nodes/${props.nodeId}/warehouse${suffix}`);
async function load() {
  const current = ++generation; loading.value = true; error.value = '';
  try {
    const r = record((await apiClient.get(url())).data);
    if (integer(r.node_id, 1) !== props.nodeId || typeof r.writable !== 'boolean') throw new Error('invalid-warehouse-response');
    const next = { capacity: integer(r.capacity, 1), used: integer(r.used), limit: integer(r.limit, 1), next_price: r.next_price === null ? null : creditAmount(r.next_price), finance_node_id: integer(r.finance_node_id, 1), writable: r.writable };
    if (!disposed && current === generation) state.value = next;
  } catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
async function preview() {
  if (locked.value || !state.value?.next_price) return;
  const expectedPrice = state.value.next_price, input = { top_up: topUp.value }, current = ++generation; loading.value = true; error.value = '';
  try {
    const q = parseWorldQuote((await apiClient.post(url('-expand-preview'), input)).data);
    if (disposed || current !== generation) return;
    if (q.terms.price !== expectedPrice) { error.value = 'Цена изменилась. Обновите страницу перед расширением.'; return; }
    await props.command.submit(`/nodes/${props.nodeId}/warehouse-expand`, input, q);
    if (!disposed && current === generation && !props.command.pending.value && !props.command.error.value) await load();
  }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session], () => { state.value = null; void load(); }, { immediate: true });
watch(topUp, () => { generation++; loading.value = false; });
onScopeDispose(() => { disposed = true; generation++; });
</script>
<template lang="pug">
section.warehouse-panel
  h2 Вместимость склада
  n-alert(v-if="error" type="error") {{ error }}
  template(v-if="state")
    p Занято {{ state.used }} из {{ state.capacity }} ячеек. Максимум после расширения: {{ state.limit }}.
    n-progress(type="line" :percentage="Math.min(100, Math.round(state.used / state.capacity * 100))" :status="state.used >= state.capacity ? 'warning' : 'success'")
    n-alert(v-if="state.used >= state.capacity" type="warning") Склад заполнен. Заберите предметы или расширьте его перед производством.
    router-link(:to="`/world/nodes/${state.finance_node_id}#finance`") Бюджет для оплаты
    template(v-if="state.next_price")
      p Следующая ячейка: {{ formatCredits(state.next_price) }} Cr. Каждая последующая стоит дороже.
      n-checkbox(v-model:checked="topUp" :disabled="locked") Доплатить с личного баланса, если бюджета недостаточно
      n-button(:disabled="locked" :loading="loading" @click="preview") Открыть ячейку · {{ formatCredits(state.next_price) }} Cr
</template>
<style scoped>
.warehouse-panel { display: grid; gap: .75rem; }
</style>

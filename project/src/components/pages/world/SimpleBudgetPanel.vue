<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton, NCard, NInput } from 'naive-ui';
import { budget } from '@/services/api/simpleWorld';
import { worldError } from '@/services/api/world';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { formatCredits } from '@/entities/world/credits';
const props = defineProps<{ nodeId: number; session: number; owner: number }>();
const emit = defineEmits<{ changed: [] }>();
const amount = ref(''), available = ref('0.0000'), reserved = ref('0.0000'), error = ref('');
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.${props.nodeId}.budget`), computed(() => props.session));
let epoch = 0, disposed = false;
async function load() {
  const token = ++epoch;
  try {
    const row = await budget(props.nodeId);
    if (token !== epoch || disposed) return;
    available.value = row.available; reserved.value = row.reserved;
  } catch (cause) { if (token === epoch && !disposed) error.value = worldError(cause); }
}
async function fund() {
  const result = runner.pending.value ? await runner.retry() : await runner.submit(`objects/${props.nodeId}/budget`, { amount: amount.value });
  if (result) { amount.value = ''; await load(); emit('changed'); }
}
watch(() => [props.nodeId, props.session], () => { error.value = ''; void load(); }, { immediate: true });
onScopeDispose(() => { disposed = true; epoch++; });
</script>
<template lang="pug">
n-card(title="Бюджет объекта")
  p Доступно: {{ formatCredits(available) }} Cr. Зарезервировано на стройки: {{ formatCredits(reserved) }} Cr.
  n-alert(v-if="error" type="error") {{ error }}
  n-alert(v-if="runner.error.value" type="error") {{ runner.error.value }}
  n-input(v-model:value="amount" placeholder="Сумма взноса в Cr" :disabled="runner.busy.value || !!runner.pending.value" :input-props="{ inputmode: 'decimal' }")
  n-button(:loading="runner.busy.value" @click="fund") {{ runner.pending.value ? 'Повторить запрос' : 'Пополнить из личного баланса' }}
</template>

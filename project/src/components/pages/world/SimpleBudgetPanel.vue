<script setup lang="ts">
import WorldCredits from '@/components/pages/world/WorldCredits.vue';
import { worldActionButtonTheme } from '@/entities/world/theme';
import WorldCreditInput from './WorldCreditInput.vue';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton, NCard, NInput } from 'naive-ui';
import { budget } from '@/services/api/simpleWorld';
import { worldError } from '@/services/api/world';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { formatCredits } from '@/entities/world/credits';
const props = defineProps<{ nodeId: number; session: number; owner: number }>();
const emit = defineEmits<{ changed: [] }>();
const amount = ref(''), available = ref('0.0000'), reserved = ref('0.0000'), error = ref('');
const receipt = ref<string | null>(null);
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
  const paid = typeof runner.pending.value?.body.amount === 'string' ? runner.pending.value.body.amount : amount.value;
  const result = runner.pending.value ? await runner.retry() : await runner.submit(`objects/${props.nodeId}/budget`, { amount: amount.value });
  if (result) { amount.value = ''; await load(); receipt.value = paid; emit('changed'); }
}
watch(() => [props.nodeId, props.session], () => { error.value = ''; receipt.value = null; void load(); }, { immediate: true });
onScopeDispose(() => { disposed = true; epoch++; });
</script>
<template lang="pug">
n-card(title="Бюджет объекта")
  p Доступно: #[world-credits(:value="available")] . Зарезервировано на стройки: #[world-credits(:value="reserved")] .
  n-alert(closable v-if="error" type="error") {{ error }}
  n-alert(closable v-if="runner.error.value" type="error") {{ runner.error.value }}
  n-alert(v-if="receipt" type="success" closable @close="receipt = null") Бюджет пополнен на #[world-credits(:value="receipt")]. Доступно: #[world-credits(:value="available")].
  world-credit-input(v-else v-model:value="amount" placeholder="Сумма взноса" :disabled="runner.busy.value || !!runner.pending.value" :input-props="{ inputmode: 'decimal' }")
  n-button(v-if="receipt" @click="receipt = null") Новый взнос
  n-button(v-else :theme-overrides="worldActionButtonTheme" :loading="runner.busy.value" @click="fund") {{ runner.pending.value ? 'Повторить запрос' : 'Пополнить из личного баланса' }}
</template>

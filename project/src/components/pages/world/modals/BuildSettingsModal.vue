<script setup lang="ts">
import WorldCredits from '@/components/pages/world/WorldCredits.vue';
import { worldActionButtonTheme, worldModalTheme } from '@/entities/world/theme';
import WorldCreditInput from '../WorldCreditInput.vue';
import WorldPaymentSources from '../WorldPaymentSources.vue';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton, NCheckbox, NInput, NModal, NSpin } from 'naive-ui';
import type { Build } from '@/services/api/simpleWorld';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { creditUnits, formatCredits } from '@/entities/world/credits';
const props = defineProps<{ show: boolean; project: Build | null; name: string; owner: number; session: number; navigate?: boolean; creating?: boolean; creationError?: string; repair?: boolean; draft?: { price: string; budgetAvailable: string | null }; creationPending?: boolean; budgetError?: string }>();
const repairing = computed(() => props.repair || props.project?.job_kind === 'repair');
const emit = defineEmits<{ 'update:show': [value: boolean]; saved: []; 'refresh-budget': []; create: [value: { name: string; labor_budget: string; top_up: boolean }, retry: boolean] }>();
const router = useRouter(), name = ref(''), budget = ref('0'), topUp = ref(false);
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.${props.project?.id}.build-settings`), computed(() => props.session));
const blocked = computed(() => runner.busy.value || !!runner.pending.value || !!props.creating);
const valid = computed(() => !!name.value.trim() && /^(0|[1-9]\d{0,10})(\.\d{1,4})?$/.test(budget.value) && Number(budget.value) >= Number(props.project?.labor_budget ?? 0));
const available = computed(() => props.draft?.budgetAvailable ?? props.project?.budget_available ?? null);
const needsTopUp = computed(() => valid.value && available.value !== null && creditUnits(props.draft?.price ?? '0') + creditUnits(budget.value) - creditUnits(props.project?.labor_budget ?? '0') > creditUnits(available.value));
const paymentPrice = computed(() => {
  if (!valid.value) return null;
  const units = creditUnits(props.draft?.price ?? '0') + creditUnits(budget.value) - creditUnits(props.project?.labor_budget ?? '0');
  return `${units / 10000n}.${String(units % 10000n).padStart(4, '0')}`;
});
watch(() => props.show, value => { if (value) { name.value = props.name; budget.value = props.project?.labor_budget ?? '0'; topUp.value = false; } }, { immediate: true });
async function save(retry = false) {
  if (props.draft) { if (retry || valid.value) emit('create', { name: name.value.trim(), labor_budget: budget.value, top_up: needsTopUp.value && topUp.value }, retry); return; }
  if (!props.project || (!retry && !valid.value)) return;
  const session = props.session, target = props.project.node_id;
  const result = retry ? await runner.retry() : await runner.submit(`builds/${props.project.id}/settings`, { name: name.value.trim(), labor_budget: budget.value, top_up: needsTopUp.value && topUp.value });
  if (!result || props.session !== session) return;
  emit('update:show', false); emit('saved');
  if (props.navigate) await router.push({ path: `/world/nodes/${target}`, hash: '#map' });
}
</script>
<template lang="pug">
n-modal(:theme-overrides="worldModalTheme" :show="show" preset="card" :title="repairing ? 'Параметры ремонта' : 'Параметры строительства'" :mask-closable="!blocked" :close-on-esc="!blocked" :closable="!blocked" :style="{ width: 'min(42rem, 95vw)' }" @update:show="emit('update:show', $event)")
  p При бюджете труда больше 0 другие игроки могут помочь {{ repairing ? 'в ремонте' : 'в строительстве' }} и заработать кредиты.
  p(v-if="draft && creditUnits(draft.price) > 0n") Цена объекта: #[world-credits(:value="draft.price")] . Материалы и бюджет труда учитываются отдельно.
  .build-creation-status(role="status")
    n-spin(v-if="creating" size="small")
    span(v-if="creating") {{ repairing ? 'Подготавливаем ремонт…' : 'Размещаем объект…' }}
    span(v-else-if="!project && !creationError && !draft") Ожидаем подтверждение размещения.
  n-alert(v-if="creationError" type="error") {{ creationError }}
  n-alert(v-if="budgetError" type="error") {{ budgetError }}
  n-button(v-if="budgetError" :disabled="blocked" @click="emit('refresh-budget')") Повторить проверку бюджета
  .build-settings-fields
    label Название
      n-input(v-model:value="name" :maxlength="120" :disabled="blocked" :input-props="{ 'aria-label': 'Название объекта' }")
    label {{ repairing ? 'Бюджет ремонта, кредиты' : 'Бюджет строительства, кредиты' }}
      world-credit-input(v-model:value="budget" :disabled="blocked" :input-props="{ inputmode: 'decimal', 'aria-label': repairing ? 'Бюджет ремонта' : 'Бюджет строительства' }")
  p Свободный бюджет:
    world-credits(v-if="available !== null" :value="available")
    template(v-else) загружается…
    | . Уже выделено строителям: #[world-credits(:value="project?.labor_budget ?? '0'")].
  world-payment-sources(v-model:checked="topUp" :price="paymentPrice" :available="available" :disabled="blocked || creationPending")
  n-alert(v-if="runner.error.value" type="error") {{ runner.error.value }}
  n-button(:theme-overrides="worldActionButtonTheme" v-if="creationPending || runner.pending.value" :disabled="blocked" @click="save(true)") Повторить запрос
  n-button(:theme-overrides="worldActionButtonTheme" v-else type="primary" :disabled="blocked || !valid || (!project && !draft) || (needsTopUp && !topUp) || (draft && available === null)" :loading="runner.busy.value || creating" @click="save()") Сохранить
</template>
<style scoped>
.build-creation-status { display: flex; align-items: center; gap: .5rem; min-height: 1.5rem; }.build-settings-fields { display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; }.build-settings-fields label { display: grid; gap: .4rem; min-width: 0; }@media(max-width: 540px) { .build-settings-fields { grid-template-columns: 1fr; } }
</style>

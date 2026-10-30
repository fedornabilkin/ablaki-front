<script setup lang="ts">
import AppDialog from '@/components/AppDialog.vue';
import WorldCredits from '@/components/pages/world/WorldCredits.vue';
import { worldActionButtonTheme, worldModalTheme } from '@/entities/world/theme';
import WorldCreditInput from '../WorldCreditInput.vue';
import WorldPaymentSources from '../WorldPaymentSources.vue';
import WorldHelpHint from '../WorldHelpHint.vue';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton, NCheckbox, NInput, NModal, NSpin } from 'naive-ui';
import type { Build } from '@/services/api/simpleWorld';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { creditUnits, formatCredits } from '@/entities/world/credits';
const props = defineProps<{ show: boolean; project: Build | null; name: string; owner: number; session: number; navigate?: boolean; creating?: boolean; creationError?: string; repair?: boolean; draft?: { price: string; minimumBudget?: string; budgetAvailable: string | null }; creationPending?: boolean; budgetError?: string }>();
const repairing = computed(() => props.repair || props.project?.job_kind === 'repair');
const emit = defineEmits<{ 'update:show': [value: boolean]; saved: []; 'refresh-budget': []; create: [value: { name: string; labor_budget: string; top_up: boolean }, retry: boolean] }>();
const router = useRouter(), name = ref(''), budget = ref('0'), topUp = ref(false);
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.${props.project?.id}.build-settings`), computed(() => props.session));
const blocked = computed(() => runner.busy.value || !!runner.pending.value || !!props.creating);
const minimum = computed(() => props.draft?.minimumBudget ?? props.project?.minimum_labor_budget ?? '0');
const normalizedBudget = computed(() => budget.value.trim() || '0');
const helpers = computed(() => /^(0|[1-9]\d*)(\.\d{1,4})?$/.test(normalizedBudget.value) ? String(creditUnits(normalizedBudget.value) / 20000n) : '0');
const valid = computed(() => !!name.value.trim() && /^(0|[1-9]\d{0,10})(\.\d{1,4})?$/.test(normalizedBudget.value) && (Number(normalizedBudget.value) === 0 || Number(normalizedBudget.value) >= Number(minimum.value)) && (props.project?.can_reduce_budget !== false || Number(normalizedBudget.value) >= Number(props.project.labor_budget)));
const available = computed(() => props.draft?.budgetAvailable ?? props.project?.budget_available ?? null);
const needsTopUp = computed(() => valid.value && available.value !== null && creditUnits(props.draft?.price ?? '0') + creditUnits(normalizedBudget.value) - creditUnits(props.project?.labor_budget ?? '0') > creditUnits(available.value));
const paymentPrice = computed(() => {
  if (!valid.value) return null;
  const delta = creditUnits(props.draft?.price ?? '0') + creditUnits(normalizedBudget.value) - creditUnits(props.project?.labor_budget ?? '0');
  const units = delta > 0n ? delta : 0n;
  return `${units / 10000n}.${String(units % 10000n).padStart(4, '0')}`;
});
watch(() => props.show, value => { if (value) { name.value = props.name; budget.value = props.project?.labor_budget ?? minimum.value; topUp.value = false; } }, { immediate: true });
async function save(retry = false) {
  if (props.draft) { if (retry || valid.value) emit('create', { name: name.value.trim(), labor_budget: normalizedBudget.value, top_up: needsTopUp.value && topUp.value }, retry); return; }
  if (!props.project || (!retry && !valid.value)) return;
  const session = props.session, target = props.project.node_id;
  const result = retry ? await runner.retry() : await runner.submit(`builds/${props.project.id}/settings`, { name: name.value.trim(), labor_budget: normalizedBudget.value, top_up: needsTopUp.value && topUp.value });
  if (!result || props.session !== session) return;
  emit('update:show', false); emit('saved');
  if (props.navigate) await router.push({ path: `/world/nodes/${target}`, hash: '#map' });
}
</script>
<template lang="pug">
app-dialog(icon="hammer" :show="show" :title="repairing ? 'Параметры ремонта' : 'Параметры строительства'" :mask-closable="!blocked" :close-on-esc="!blocked" :closable="!blocked" :style="{ width: 'min(54rem, 95vw)' }" @update:show="emit('update:show', $event)")
  .build-creation-status(role="status")
    n-spin(v-if="creating" size="small")
    span(v-if="creating") {{ repairing ? 'Подготавливаем ремонт…' : 'Размещаем объект…' }}
    span(v-else-if="!project && !creationError && !draft") Ожидаем подтверждение размещения.
  n-alert(closable v-if="creationError" type="error") {{ creationError }}
  n-alert(closable v-if="budgetError" type="error") {{ budgetError }}
  n-button(v-if="budgetError" :disabled="blocked" @click="emit('refresh-budget')") Повторить проверку бюджета
  .build-settings-layout
    .build-settings-form
      .build-mobile-help
        world-help-hint(label="Как настроить строительство")
          p Бюджет нужен для найма. Владелец работает бесплатно; для самостоятельной стройки укажите 0.
          p(v-if="Number(minimum) > 0") Для найма от #[world-credits(:value="minimum")]. Помощников: {{ helpers }} (2 кредита на место).
          p Оплата распределяется пропорционально вкладу. Неиспользованный бюджет освобождается.
          p При отмене возвращается 70% материалов, цена объекта не возвращается.
      .build-settings-fields
        label Название
          n-input(v-model:value="name" :maxlength="120" :disabled="blocked" :input-props="{ 'aria-label': 'Название объекта' }")
        label {{ repairing ? 'Бюджет ремонта, кредиты' : 'Бюджет строительства, кредиты' }}
          world-credit-input(v-model:value="budget" :disabled="blocked" :input-props="{ inputmode: 'decimal', 'aria-label': repairing ? 'Бюджет ремонта' : 'Бюджет строительства' }")
      p(v-if="project?.can_reduce_budget === false") Помощники уже приняли работу. Их оплату можно увеличить.
      .build-money-summary
        p Свободный бюджет:
          world-credits(v-if="available !== null" :value="available")
          template(v-else) загружается…
        p Уже выделено строителям: #[world-credits(:value="project?.labor_budget ?? '0'")]
        p(v-if="draft && creditUnits(draft.price) > 0n") Цена объекта: #[world-credits(:value="draft.price")]
      world-payment-sources(v-model:checked="topUp" :price="paymentPrice" :available="available" :disabled="blocked || creationPending")
      n-alert(closable v-if="runner.error.value" type="error") {{ runner.error.value }}
      n-button(:theme-overrides="worldActionButtonTheme" v-if="creationPending || runner.pending.value" :disabled="blocked" @click="save(true)") Повторить запрос
      n-button(:theme-overrides="worldActionButtonTheme" v-else type="primary" :disabled="blocked || !valid || (!project && !draft) || (needsTopUp && !topUp) || (draft && available === null && Number(paymentPrice) > 0)" :loading="runner.busy.value || creating" @click="save()") Сохранить
    aside.build-instructions(aria-label="Условия строительства")
      h3 Как устроена стройка
      p Бюджет позволяет нанять строителей. Владелец работает бесплатно; для самостоятельной стройки укажите 0.
      p(v-if="Number(minimum) > 0") Для найма бюджет от #[world-credits(:value="minimum")]. Одновременно помощников: {{ helpers }} (2 кредита на место).
      p Можно разместить несколько проектов. Другие участники могут строить их, пока вы занимаетесь миром. Персонаж работает на одной стройке за раз.
      p Оплата пропорциональна вкладу. Неиспользованный бюджет освобождается после завершения.
      p Материалы и цена объекта учитываются отдельно. При отмене возвращается 70% материалов; цена объекта не возвращается.
</template>
<style scoped>
.build-creation-status { display: flex; align-items: center; gap: .5rem; min-height: 1.5rem; }
.build-settings-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1.5rem; align-items: start; }.build-settings-form, .build-settings-fields { display: grid; gap: .85rem; }.build-settings-fields label { display: grid; gap: .4rem; min-width: 0; }.build-settings-form > .n-button { justify-self: start; }.build-money-summary p { display: flex; flex-wrap: wrap; align-items: baseline; gap: .4rem; margin: .3rem 0; }.build-settings-layout :deep(.world-credits) { margin-inline: .2em; }.build-instructions { color: var(--text-muted); font-size: .85rem; }.build-instructions h3 { margin-top: 0; color: var(--text); }.build-mobile-help { display: none; }
@media(max-width: 640px) { .build-settings-layout { grid-template-columns: 1fr; }.build-instructions { display: none; }.build-mobile-help { display: flex; justify-content: flex-end; } }
</style>

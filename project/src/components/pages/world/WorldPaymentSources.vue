<script setup lang="ts">
import { computed } from 'vue';
import { NCheckbox } from 'naive-ui';
import { creditUnits, needsPersonalTopUp } from '@/entities/world/credits';
import WorldHelpHint from './WorldHelpHint.vue';
const props = withDefaults(defineProps<{
  price?: string | null; available?: string | null; checked?: boolean; disabled?: boolean;
  mode?: 'budget-top-up' | 'budget-choice' | 'budget' | 'personal' | 'treasury';
}>(), { checked: false, disabled: false, mode: 'budget-top-up' });
const emit = defineEmits<{ 'update:checked': [value: boolean] }>();
const paid = computed(() => props.price != null && creditUnits(props.price) > 0n);
const topUp = computed(() => props.mode === 'budget-top-up' && needsPersonalTopUp(props.price, props.available));
</script>
<template lang="pug">
fieldset.world-payment-sources(v-if="paid")
  legend Оплата
  .payment-source-options
    n-checkbox(v-if="mode === 'budget-choice' || mode === 'budget-top-up' || mode === 'budget'" :checked="mode !== 'budget-choice' || checked" :disabled="disabled || mode !== 'budget-choice'" @update:checked="emit('update:checked', $event)") Из бюджета объекта
    n-checkbox(v-if="mode === 'budget-choice' || mode === 'personal' || topUp" :checked="mode === 'personal' || (mode === 'budget-choice' ? !checked : checked)" :disabled="disabled || mode === 'personal'" @update:checked="emit('update:checked', mode === 'budget-choice' ? !$event : $event)") {{ topUp ? 'Добавить с баланса' : 'С личного баланса' }}
    n-checkbox(v-if="mode === 'treasury'" checked disabled) Из казны
    world-help-hint(label="Как списываются кредиты" symbol="i")
      p(v-if="mode === 'budget-top-up'") Сначала используется свободный бюджет объекта. Если его недостаточно, галочка «Добавить с баланса» разрешает пополнить только недостающую сумму с личного баланса.
      p(v-else-if="mode === 'budget-choice'") Выберите один источник: свободный бюджет объекта или личный баланс. Сумму и доступность проверяет сервер перед изготовлением.
      p(v-else-if="mode === 'treasury'") Поступления из казны переводятся в бюджет объекта с учётом обязательных отчислений.
      p(v-else-if="mode === 'budget'") Операция расходует бюджет объекта; зарезервированные кредиты учитываются отдельно.
      p(v-else) Операция списывает указанную сумму с личного баланса.
</template>
<style scoped>
.world-payment-sources { min-width: 0; margin: 0; padding: .6rem .75rem; border: 1px solid var(--border); border-radius: .5rem; }
legend { padding-inline: .25rem; font-size: .75rem; color: var(--text-muted); }
.payment-source-options { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem 1rem; }
</style>

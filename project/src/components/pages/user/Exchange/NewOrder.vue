<script setup lang="ts">
import { useToasts } from '@/hooks/useToasts';
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { NModal, NForm, NFormItem, NRadioGroup, NRadioButton, NInputNumber, NButton, NAlert } from 'naive-ui';
import { mutate, errorText } from '@/services/api/portal';
defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ close: []; created: [] }>();
const store = useStore();
const message = useToasts();
const type = ref('buy');
const credit = ref<number | null>(50);
const price = ref<number | null>(1);
const count = ref<number | null>(1);
const busy = ref(false);
const error = ref('');
const amount = computed(() => Math.round(Number(price.value) / 1000 * Number(credit.value) * 10000) / 10000);
const valid = computed(() => credit.value !== null && Number.isFinite(credit.value) && credit.value >= 1 && credit.value <= 1000000000 && price.value !== null && Number.isFinite(price.value) && price.value >= .01 && price.value <= 1000000000 && amount.value >= .01 && amount.value <= 1000000000 && count.value !== null && Number.isSafeInteger(count.value) && count.value >= 1 && count.value <= 100);
async function create() {
  if (busy.value || !valid.value) return;
  const revision = store.state.auth.revision;
  busy.value = true; error.value = '';
  try {
    await mutate('exchange', 'post', { type: type.value, credit: credit.value, amount: amount.value, count: count.value });
    if (revision !== store.state.auth.revision) return;
    emit('created');
    message.success('Заявка создана');
    try { await store.dispatch('auth/fetchData'); }
    catch { message.warning('Заявка создана. Обновите профиль, чтобы увидеть актуальный счёт.'); }
  } catch (cause) { error.value = errorText(cause); }
  finally { busy.value = false; }
}
</script>
<template lang="pug">
n-modal(:show="isOpen" preset="card" title="Добавить заявку" :style="{ width: 'min(32.5rem, calc(100vw - 2rem))' }" :mask-closable="!busy" :closable="!busy" :close-on-esc="!busy" @update:show="!busy && $emit('close')")
  n-form(@submit.prevent="create")
    n-radio-group.mb-3(v-model:value="type" :disabled="busy" aria-label="Тип заявки")
      n-radio-button(value="buy") Продать кредиты
      n-radio-button(value="sell") Купить кредиты
    n-form-item(label="Кредитов в заявке" :label-props="{ for: 'order-credit' }")
      n-input-number(:min="1" :max="1000000000" :step="0.00001" v-model:value="credit" :input-props="{ id: 'order-credit' , type: 'number', inputmode: 'decimal', min: 1, max: 1000000000, step: 0.00001}" :disabled="busy")
    n-form-item(label="Курс за 1000 кредитов, Кг" :label-props="{ for: 'order-price' }")
      n-input-number(:min="0.01" :max="1000000000" :step="0.01" v-model:value="price" :input-props="{ id: 'order-price' , type: 'number', inputmode: 'decimal', min: 0.01, max: 1000000000, step: 0.01}" :disabled="busy")
    n-form-item(label="Количество заявок" :label-props="{ for: 'order-count' }")
      n-input-number(:min="1" :max="100" :step="1" v-model:value="count" :input-props="{ id: 'order-count' , type: 'number', inputmode: 'numeric', min: 1, max: 100, step: 1}" :precision="0" :disabled="busy")
    p Стоимость одной заявки: {{ amount }} Кг
    n-alert.mb-3(v-if="error" type="error") {{ error }}
    n-button(type="primary" attr-type="submit" :loading="busy" :disabled="!valid") Добавить
</template>

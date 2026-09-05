<script>
import {computed, ref} from "@vue/reactivity";
import {
  NModal,
  NForm,
  NFormItem,
  NRadioGroup,
  NRadioButton,
  NInputNumber,
  NInput,
  NButton,
  useNotification,
} from 'naive-ui';

import {exchange} from "@/services/api/exchange.js";
import {errorHandler} from "@/services/api/errorHandler.js";

export default {
    components: {
        NModal,
        NForm,
        NFormItem,
        NRadioGroup,
        NRadioButton,
        NInputNumber,
        NInput,
        NButton,
    },
    props: {
        isOpen: {
            type: Boolean,
            default: true,
        },
    },
    emits: ['close', 'created'],
    setup(props, { emit }) {
        const type = ref("buy");
        const credit = ref(50);
        const price = ref(1);
        const count = ref(1);
        const isLoading = ref(false);
        const notification = useNotification();

        const createOrder = () => {
            isLoading.value = true;
            const notify = {type: 'error', message: 'Что-то пошло не так'}
            exchange.create(type.value, credit.value, finalPrice.value, count.value)
                .then(() => {
                  notify.message = 'Заявка создана'
                  notify.type = 'success'

                  emit("created", type.value);
                })
                .catch((err) => {
                  notify.type = 'warning'
                  errorHandler(err, (msg) => notify.message = msg);
                })
                .finally(() => {
                  isLoading.value = false;
                  const t = ['info', 'success', 'warning', 'error'].includes(notify.type) ? notify.type : 'info';
                  notification[t]({
                    content: notify.message,
                    duration: 4500,
                  })
                })
        };

        const closeDialog = () => {
            emit('close');
        };

        const onUpdateShow = (v) => {
            if (!v) closeDialog();
        };

        const btnActive = computed(() => credit.value > 0 && price.value > 0 && count.value > 0);

        const finalPrice = computed(() => Math.round(price.value / 1000 * credit.value * 10000) / 10000);

        return {
            props,
            type,
            credit,
            price,
            count,
            isLoading,
            createOrder,
            closeDialog,
            onUpdateShow,
            btnActive,
            finalPrice,
        };
    },
};
</script>

<template>
  <n-modal :show="props.isOpen" preset="card" title="Добавить заявку" style="max-width: 600px;" @update:show="onUpdateShow">

    <n-form label-placement="top" @submit.prevent="createOrder" class="form-new-order">

      <n-radio-group v-model:value="type">
        <n-radio-button value="buy">Продать</n-radio-button>
        <n-radio-button value="sell">Купить</n-radio-button>
      </n-radio-group>

      <div class="row mt-3">
        <div class="col-6">
          <n-form-item label="Кредитов">
            <n-input-number v-model:value="credit" :min="1"/>
          </n-form-item>
        </div>

        <div class="col-6">
          <n-form-item label="По курсу за 1000">
            <n-input-number v-model:value="price" :min="0" :step="0.01"/>
          </n-form-item>
        </div>
      </div>

      <div class="row">
        <div class="col-6">
          <n-form-item label="Заявок">
            <n-input-number v-model:value="count" :min="1"/>
          </n-form-item>
        </div>

        <div class="col-6">
          <n-form-item label="Стоимость заявки">
            <n-input :value="String(finalPrice)" disabled/>
          </n-form-item>
        </div>
      </div>

      <div class="mt-3">
        <n-button type="primary" :disabled="!btnActive" :loading="isLoading" attr-type="submit">
          Добавить
        </n-button>
      </div>
    </n-form>
  </n-modal>
</template>

<style lang="scss" scoped>
.form-new-order {
  .label {display: flex; align-items: center;}
  .n-input-number {max-width: unset;}
}

.tabs {
  display: flex;
  .tab {padding: .2rem .5rem;}
}
</style>

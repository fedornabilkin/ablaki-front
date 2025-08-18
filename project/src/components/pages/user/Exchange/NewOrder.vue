<script>
import {computed, ref} from "@vue/reactivity";
import {ElNotification} from 'element-plus';

import {exchange} from "@/services/api/exchange.js";
import {errorHandler} from "@/services/api/errorHandler.js";

export default {
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
                  ElNotification({
                    message: notify.message,
                    type: notify.type,
                  })
                })
        };

        const closeDialog = () => {
            emit('close');
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
            btnActive,
            finalPrice,
        };
    },
};
</script>

<template>
  <el-dialog :model-value="props.isOpen" title="Добавить заявку" destroy-on-close @close="closeDialog">

    <el-form label-position="top" @submit.prevent="createOrder" class="form-new-order">

      <el-radio-group v-model="type">
        <el-radio-button label="buy">Продать</el-radio-button>
        <el-radio-button label="sell">Купить</el-radio-button>
      </el-radio-group>

      <div class="row mt-3">
        <div class="col-6">
          <el-form-item label="Кредитов" label-position="top">
            <el-input-number v-model="credit" :min="1" controls-position="right"/>
          </el-form-item>
        </div>

        <div class="col-6">
          <el-form-item label="По курсу за 1000" label-position="top">
            <el-input-number v-model="price" :min="0" :step="0.01" controls-position="right"/>
          </el-form-item>
        </div>
      </div>

      <div class="row">
        <div class="col-6">
          <el-form-item label="Заявок" label-position="top">
            <el-input-number v-model="count" :min="1" controls-position="right"/>
          </el-form-item>
        </div>

        <div class="col-6">
          <el-form-item label="Стоимость заявки" label-position="top">
            <el-input v-model="finalPrice" disabled/>
          </el-form-item>
        </div>
      </div>

      <div class="mt-3">
        <el-button type="primary" :disabled="!btnActive" :loading="isLoading" native-type="submit">
          Добавить
        </el-button>
      </div>
    </el-form>
  </el-dialog>
</template>

<style lang="scss" scoped>
.form-new-order {
  .label {display: flex; align-items: center;}
  .el-input-number {max-width: unset;}
}

.tabs {
  display: flex;
  .tab {padding: .2rem .5rem;}
}
</style>

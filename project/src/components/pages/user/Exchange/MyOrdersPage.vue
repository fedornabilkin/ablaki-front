<script setup>
import NewOrder from "./NewOrder.vue";
import OrdersList from "./OrdersList.vue";
import RequestError from '@/components/RequestError.vue';
import {exchange} from '@/services/api/exchange.js';
import {useFetchOrders} from './hooks/useFetchOrders';
import {NTag, NButton} from 'naive-ui';
import {useStore} from 'vuex';
import {errorHandler} from '@/services/api/errorHandler';

const store = useStore();

const {isLoading: isLoadingBuy, ordersList: ordersBuy, error: errorBuy, refetch: reloadBuy} = useFetchOrders(exchange.getMyBuy);

const {isLoading: isLoadingSell, ordersList: ordersSell, error: errorSell, refetch: reloadSell} = useFetchOrders(exchange.getMySell);

const onCancel = async (id, type) => {
  const orders = type === 'buy' ? ordersSell : ordersBuy;
  const order = orders.value.find(item => item.id === id);
  if (!order || order.isLoading) return;
  order.isLoading = true;
  try {
    await exchange.cancel(id);
    const index = orders.value.indexOf(order);
    if (index !== -1) orders.value.splice(index, 1);
    await store.dispatch('auth/fetchData');
  } catch (error) {
    errorHandler(error);
  } finally {
    order.isLoading = false;
  }
};

</script>

<template lang="pug">
  .row.mt-2
    .col-md-6
      h5 Мои заявки на покупку
      request-error(:failed="!!errorSell" @retry="reloadSell")
      orders-list(:orders='ordersSell' :is-loading='isLoadingSell')
        template(v-slot:info='{ credit, amount }')
          n-tag(type="success")
            | {{ amount }} Кг
            font-awesome-icon.px-1(icon='fa fa-arrow-right')
          n-tag(type="info")
            font-awesome-icon(icon='fa fa-user')
        template(v-slot:action='{ orderId, isLoading, status }')
          .d-flex.text-success(v-if="status === 'success'")
            font-awesome-icon(icon='fa fa-check')
          n-button(size='small' type='error' @click="onCancel(orderId, 'buy')" :loading='isLoading' v-if='status === null')
            template(#icon)
              font-awesome-icon(icon='fa fa-trash-alt')
    .col-md-6
      h5 Мои заявки на продажу
      request-error(:failed="!!errorBuy" @retry="reloadBuy")
      orders-list(:orders='ordersBuy' :is-loading='isLoadingBuy')
        template(v-slot:info='{ credit, amount }')
          n-tag(type="success")
            | {{ credit }} Cr
            font-awesome-icon.px-1(icon='fa fa-arrow-right')
          n-tag(type="info")
            font-awesome-icon(icon='fa fa-user')
        template(v-slot:action='{ orderId, isLoading, status }')
          .d-flex.text-success(v-if="status === 'success'")
            font-awesome-icon(icon='fa fa-check')
          n-button(size='small' type='error' @click="onCancel(orderId, 'sell')" :loading='isLoading' v-if='status === null')
            template(#icon)
              font-awesome-icon(icon='fa fa-trash-alt')

</template>

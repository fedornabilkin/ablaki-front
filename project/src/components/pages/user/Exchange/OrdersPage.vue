<script setup>
import OrdersList from "./OrdersList.vue";
import RequestError from '@/components/RequestError.vue';
import {exchange} from '@/services/api/exchange.js';
import {errorHandler} from "@/services/api/errorHandler.js";
import {useFetchOrders} from './hooks/useFetchOrders';
import {NTag, NButton} from 'naive-ui';
import {useStore} from 'vuex';


const store = useStore();

const {isLoading: isLoadingBuy, ordersList: ordersBuy, error: errorBuy, refetch: reloadBuy} = useFetchOrders(exchange.getBuy);

const {isLoading: isLoadingSell, ordersList: ordersSell, error: errorSell, refetch: reloadSell} = useFetchOrders(exchange.getSell);

const proceedOrder = async (orders, id) => {
  const order = orders.value.find(item => item.id === id);
  if (!order || order.isLoading || order.status === 'success') return;
  order.isLoading = true;
  try {
    await exchange.proceed(id);
    order.status = 'success';
    // Refresh the server balance instead of estimating settlement on the client.
    await store.dispatch('auth/fetchData');
  } catch (error) {
    errorHandler(error);
  } finally {
    order.isLoading = false;
  }
};

const onBuy = id => proceedOrder(ordersBuy, id);
const onSell = id => proceedOrder(ordersSell, id);

</script>

<template lang="pug">
  .row.mt-2
    .col-md-6
      h5 Купить кредиты
      request-error(:failed="!!errorBuy" @retry="reloadBuy")
      orders-list(:orders='ordersBuy' :isloading='isLoadingBuy')
        template(v-slot:info='{ credit, amount }')
          n-tag(type="success")
            | {{ credit }} Cr
            font-awesome-icon.px-1(icon='fa fa-arrow-right')
          n-tag(type="info")
            font-awesome-icon(icon='fa fa-user')
          n-tag(type="error")
            font-awesome-icon.px-1(icon='fa fa-arrow-right')
            | {{ amount }} Кг

        template(v-slot:action='{ orderId, isLoading, status }')
          .d-flex.text-success(v-if="status === 'success'")
            font-awesome-icon(icon='fa fa-check')
          n-button(size='small' @click='onBuy(orderId)' :loading='isLoading' v-if='status === null')
            template(#icon)
              font-awesome-icon(icon='fa fa-exchange-alt')

    .col-md-6
      h5 Продать кредиты
      request-error(:failed="!!errorSell" @retry="reloadSell")
      orders-list(:orders='ordersSell' :isloading='isLoadingSell')
        template(v-slot:info='{ credit, amount }')
          n-tag(type="success")
            | {{ amount }} Кг
            font-awesome-icon.px-1(icon='fa fa-arrow-right')
          n-tag(type="info")
            font-awesome-icon(icon='fa fa-user')
          n-tag(type="error")
            font-awesome-icon.px-1(icon='fa fa-arrow-right')
            | {{ credit }} Cr

        template(v-slot:action='{ orderId, isLoading, status }')
          .d-flex.text-success(v-if="status === 'success'")
            font-awesome-icon(icon='fa fa-check')
          n-button(size='small' @click='onSell(orderId)' :loading='isLoading' v-if='status === null')
            template(#icon)
              font-awesome-icon(icon='fa fa-exchange-alt')

</template>

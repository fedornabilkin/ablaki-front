<script setup>
import OrdersList from "./OrdersList.vue";
import {exchange} from '@/services/api/exchange.js';
import {errorHandler} from "@/services/api/errorHandler.js";
import {useFetchOrders} from './hooks/useFetchOrders';
import {NTag, NButton, useNotification} from 'naive-ui';
import {useStore} from 'vuex';


const store = useStore();
const notification = useNotification();

const {isLoading: isLoadingBuy, ordersList: ordersBuy} = useFetchOrders(exchange.getBuy);

const {isLoading: isLoadingSell, ordersList: ordersSell} = useFetchOrders(exchange.getSell);

const onBuy = (id) => {
  let orderIndex = ordersBuy.value.findIndex((order) => order.id === id);

  ordersBuy.value[orderIndex].isLoading = true;

  exchange.proceed(id).then(res => {
    ordersBuy.value[orderIndex].isLoading = false;
    ordersBuy.value[orderIndex].status = "success";

    store.dispatch('auth/addCredit', res.credit);
    store.dispatch('auth/addBalance', -res.amount);
  })
  .catch(e => {
    let message = 'Что-то пошло не так'
    errorHandler(e, (msg) => message = msg);
    notification.error({
      content: message,
      duration: 4500,
    })
  })
};

const onSell = (id) => {
  let orderIndex = ordersSell.value.findIndex((order) => order.id === id);

  console.log(orderIndex, id)
  console.log(ordersSell.value[orderIndex])
  ordersSell.value[orderIndex].isLoading = true;

  exchange.proceed(id).then(res => {
    ordersSell.value[orderIndex].isLoading = false;
    ordersSell.value[orderIndex].status = "success";

    store.dispatch('auth/addCredit', -res.credit);
    store.dispatch('auth/addBalance', res.amount);
  });
};

</script>

<template lang="pug">
  .row.mt-2
    .col-md-6
      h5 Купить кредиты
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

<script setup>
import OrdersList from "./OrdersList.vue";
import {exchange} from '@/services/api/exchange.js';
import {errorHandler} from "@/services/api/errorHandler.js";
import {useFetchOrders} from './hooks/useFetchOrders';
import {ElNotification} from 'element-plus';
import {useStore} from 'vuex';


const store = useStore();

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
  }).catch(e => {
    errorHandler(e, {
      "Type is invalid.": () => ElNotification({
        message: 'Type is invalid',
        type: 'error',
      })
    });
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
          el-tag(type="success" effect="light")
            | {{ credit }} Cr
            font-awesome-icon.px-1(icon='fa fa-arrow-right')
          el-tag(type="info" effect="light")
            font-awesome-icon(icon='fa fa-user')
          el-tag(type="error" effect="light")
            font-awesome-icon.px-1(icon='fa fa-arrow-right')
            | {{ amount }} Кг

        template(v-slot:action='{ orderId, isLoading, status }')
          .d-flex.text-success(v-if="status === 'success'")
            font-awesome-icon(icon='fa fa-check')
          el-button(size='small' @click='onBuy(orderId)' :loading='isLoading' v-if='status === null')
            font-awesome-icon(icon='fa fa-exchange-alt')

    .col-md-6
      h5 Продать кредиты
      orders-list(:orders='ordersSell' :isloading='isLoadingSell')
        template(v-slot:info='{ credit, amount }')
          el-tag(type="success" effect="light")
            | {{ amount }} Кг
            font-awesome-icon.px-1(icon='fa fa-arrow-right')
          el-tag(type="info" effect="light")
            font-awesome-icon(icon='fa fa-user')
          el-tag(type="error" effect="light")
            font-awesome-icon.px-1(icon='fa fa-arrow-right')
            | {{ credit }} Cr

        template(v-slot:action='{ orderId, isLoading, status }')
          .d-flex.text-success(v-if="status === 'success'")
            font-awesome-icon(icon='fa fa-check')
          el-button(size='small' @click='onSell(orderId)' :loading='isLoading' v-if='status === null')
            font-awesome-icon(icon='fa fa-exchange-alt')

</template>

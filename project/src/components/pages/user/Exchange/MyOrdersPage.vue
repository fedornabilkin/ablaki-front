<script setup>
import NewOrder from "./NewOrder.vue";
import OrdersList from "./OrdersList.vue";
import {exchange} from '@/services/api/exchange.js';
import {useFetchOrders} from './hooks/useFetchOrders';

const {isLoading: isLoadingBuy, ordersList: ordersBuy} = useFetchOrders(exchange.getMyBuy);

const {isLoading: isLoadingSell, ordersList: ordersSell} = useFetchOrders(exchange.getMySell);

const onCancel = (id, type) => {
  if (type === "buy") {
    let orderIndex = ordersSell.value.findIndex((order) => order.id === id);
    ordersSell.value[orderIndex].isLoading = true;

    exchange.cancel(id).then(res => {
      ordersSell.value[orderIndex].isLoading = false;
      ordersSell.value[orderIndex].status = "success";

      ordersSell.value.splice(orderIndex, 1);
    });
  }

  if (type === "sell") {
    let orderIndex = ordersBuy.value.findIndex((order) => order.id === id);
    ordersBuy.value[orderIndex].isLoading = true;

    exchange.cancel(id).then(res => {
      ordersBuy.value[orderIndex].isLoading = false;
      ordersBuy.value[orderIndex].status = "success";

      ordersBuy.value.splice(orderIndex, 1);
    });
  }
};

</script>

<template lang="pug">
  .row.mt-2
    .col-md-6
      h5 Мои заявки на покупку
      orders-list(:orders='ordersSell' :isloading='isLoadingSell')
        template(v-slot:info='{ credit, amount }')
          el-tag(type="success" effect="light")
            | {{ amount }} Кг
            font-awesome-icon.px-1(icon='fa fa-arrow-right')
          el-tag(type="info" effect="light")
            font-awesome-icon(icon='fa fa-user')
        template(v-slot:action='{ orderId, isLoading, status }')
          .d-flex.text-success(v-if="status === 'success'")
            font-awesome-icon(icon='fa fa-check')
          el-button(size='small' type='danger' @click="onCancel(orderId, 'buy')" :loading='isLoading' v-if='status === null')
            font-awesome-icon(icon='fa fa-trash-alt')
    .col-md-6
      h5 Мои заявки на продажу
      orders-list(:orders='ordersBuy' :isloading='isLoadingBuy')
        template(v-slot:info='{ credit, amount }')
          el-tag(type="success" effect="light")
            | {{ credit }} Cr
            font-awesome-icon.px-1(icon='fa fa-arrow-right')
          el-tag(type="info" effect="light")
            font-awesome-icon(icon='fa fa-user')
        template(v-slot:action='{ orderId, isLoading, status }')
          .d-flex.text-success(v-if="status === 'success'")
            font-awesome-icon(icon='fa fa-check')
          el-button(size='small' type='danger' @click="onCancel(orderId, 'sell')" :loading='isLoading' v-if='status === null')
            font-awesome-icon(icon='fa fa-trash-alt')

</template>

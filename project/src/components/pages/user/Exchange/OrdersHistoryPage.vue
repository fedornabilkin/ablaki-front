<script setup>
import {exchange} from '@/services/api/exchange.js';
import {useFetch} from '@/hooks/useFetch.js';
import OrdersList from './OrdersList.vue';
import moment from 'moment';

const {result: orders, isLoading: isLoading} = useFetch(exchange.getHistory, []);

const formatDatetime = (timestamp) => {
  return moment(timestamp * 1000).format("DD.MM.YY HH:mm:ss")
}

</script>

<template lang="pug">
  h5.mt-2 История сделок
  orders-list(:orders='orders' :isloading='isLoading')
    template(v-slot:info='{credit, amount, datetime}')
      el-tag(type="success" effect="light")
        span(v-if="type === 'sell'") {{ credit }} Cr
        span(v-else) {{ amount }} Кг
        font-awesome-icon.px-1(icon='fa fa-arrow-right')
      el-tag(type="info" effect="light")
        font-awesome-icon(icon='fa fa-user')
      el-tag(type="error" effect="light")
        font-awesome-icon.px-1(icon='fa fa-arrow-right')
        span(v-if="type === 'sell'") {{ amount }} Кг
        span(v-else) {{ credit }} Cr

      time.text-muted.mx-1 {{ formatDatetime(datetime) }}

</template>

<style lang="scss" scoped>
</style>

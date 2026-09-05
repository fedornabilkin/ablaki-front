<script setup>
import {exchange} from '@/services/api/exchange.js';
import {useFetch} from '@/hooks/useFetch.js';
import OrdersList from './OrdersList.vue';
import RequestError from '@/components/RequestError.vue';
import moment from 'moment';
import {NTag} from 'naive-ui';

const {result: orders, isLoading, error, refetch} = useFetch(exchange.getHistory, []);

const formatDatetime = (timestamp) => {
  return moment(timestamp * 1000).format("DD.MM.YY HH:mm:ss")
}

</script>

<template lang="pug">
  h5.mt-2 История сделок
  request-error(:failed="!!error" @retry="refetch")
  orders-list(:orders='orders' :is-loading='isLoading')
    template(v-slot:info='{credit, amount, datetime}')
      n-tag(type="success")
        span(v-if="type === 'sell'") {{ credit }} Cr
        span(v-else) {{ amount }} Кг
        font-awesome-icon.px-1(icon='fa fa-arrow-right')
      n-tag(type="info")
        font-awesome-icon(icon='fa fa-user')
      n-tag(type="error")
        font-awesome-icon.px-1(icon='fa fa-arrow-right')
        span(v-if="type === 'sell'") {{ amount }} Кг
        span(v-else) {{ credit }} Cr

      time.text-muted.mx-1 {{ formatDatetime(datetime) }}

</template>

<style lang="scss" scoped>
</style>

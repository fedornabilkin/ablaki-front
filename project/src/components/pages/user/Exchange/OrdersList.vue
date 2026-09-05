<script setup>
import {h} from 'vue';
import {NDataTable} from 'naive-ui';

const props = defineProps(['orders', 'isLoading'])
const slots = defineSlots()

const columns = [
  { title: '#', key: 'id', width: 60 },
  { title: '*1000', key: 'price', width: 80, render: (row) => `${row.price} Кг` },
  {
    title: '',
    key: 'info',
    render: (row) => slots.info
      ? slots.info({ credit: row.credit, amount: row.amount, datetime: row.updated_at })
      : null,
  },
  {
    title: '',
    key: 'action',
    width: 60,
    render: (row) => slots.action
      ? slots.action({
          orderId: row.id,
          isLoading: row.loading,
          status: row.status,
          type: row.type,
        })
      : null,
  },
]
</script>

<template>
  <n-data-table
    :data="props.orders"
    :columns="columns"
    :loading="props.isLoading"
  />
</template>

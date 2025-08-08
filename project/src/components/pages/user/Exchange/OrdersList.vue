<script setup>

const props = defineProps(['orders', 'isLoading'])

</script>

<template lang="pug">
  el-table(:data='props.orders' v-loading='props.isLoading' stripe empty-text='Заявки не найдены')
    el-table-column(prop='id' label='#' width='60')
    el-table-column(prop='price' :formatter='(row) => `${row.price} Кг`' label='*1000' width='80')
    el-table-column(label='')
      template(#default='scope')
        slot(name='info' :credit='scope.row.credit' :amount='scope.row.amount' :datetime='scope.row.updated_at')
    el-table-column(label='' width='60')
      template(#default='scope')
        slot(
          name='action'
          :orderId='scope.row.id'
          :isloading='scope.row.loading'
          :status='scope.row.status'
          :type='scope.row.type'
        )

</template>
<script>
export default {
    props: {
        orders: {
            type: Array,
            default: () => [],
        },
        isLoading: {
            type: Boolean,
            default: () => false,
        }
    },
    setup(props, {emit}) {
        return {

        }
    },
}
</script>

<template>
    <el-table :data="orders" v-loading="isLoading" stripe empty-text="Заявки не найдены">
        <el-table-column prop="price" :formatter="(row) => `${row.price} Кг`" label="Цена за 1000" width="120"/>
        <el-table-column label="">
            <template #default="scope">
                <slot
                    name="action"
                    :orderId="scope.row.id"
                    :isLoading="scope.row.isLoading"
                    :status="scope.row.status"
                    :credit="scope.row.credit"
                    :amount="scope.row.amount"
                />
            </template>
        </el-table-column>
    </el-table>
</template>
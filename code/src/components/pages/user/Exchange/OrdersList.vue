<script>
export default {
    props: {
        orders: {
            type: Array,
            default: () => [],
        }
    },
    setup(props, {emit}) {
        return {

        }
    },
}
</script>

<template>
    <el-table :data="orders" stripe empty-text="Заявки не найдены">
        <el-table-column prop="rate" label="Цена за 1000" width="120"/>
        <el-table-column label="">
            <template #default="scope">
                <slot
                    name="action"
                    :orderId="scope.row.id"
                    :isLoading="scope.row.isLoading"
                    :status="scope.row.status"
                    :credit="scope.row.credit"
                    :price="scope.row.rate * scope.row.credit / 1000"
                />
            </template>
        </el-table-column>
    </el-table>   
</template>
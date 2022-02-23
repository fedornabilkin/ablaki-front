<script>
    import { ref } from "@vue/reactivity";
    import NewOrder from "./NewOrder.vue";
    import OrdersList from "./OrdersList.vue";
    export default {
        components: { NewOrder, OrdersList },
        setup() {
            const ordersBuy = ref([
                {
                    id: 1,
                    rate: 2,
                    credit: 59,
                },
                {
                    id: 222,
                    rate: 22,
                    credit: 599,
                },
            ]);

            const ordersSell = ref([
                {
                    id: 2,
                    rate: 0.5,
                    credit: 58,
                },
            ]);

            ordersBuy.value = ordersBuy.value.map((order) => {
                return {
                    ...order,
                    isLoading: false,
                    status: null,
                };
            });

            ordersSell.value = ordersSell.value.map((order) => {
                return {
                    ...order,
                    isLoading: false,
                    status: null,
                };
            });

            const onCancel = (id, type) => {
                if (type === "buy") {
                    let orderIndex = ordersBuy.value.findIndex((order) => order.id === id);
                    ordersBuy.value[orderIndex].isLoading = true;

                    setTimeout(() => {
                        ordersBuy.value[orderIndex].isLoading = false;
                        ordersBuy.value[orderIndex].status = "success";

                        ordersBuy.value.splice(orderIndex, 1);
                    }, 1000);
                }
                
                if (type === "sell") {
                    let orderIndex = ordersSell.value.findIndex((order) => order.id === id);
                    ordersSell.value[orderIndex].isLoading = true;

                    setTimeout(() => {
                        ordersSell.value[orderIndex].isLoading = false;
                        ordersSell.value[orderIndex].status = "success";

                        ordersSell.value.splice(orderIndex, 1);
                    }, 1000);
                }
            };

            return {
                ordersBuy,
                ordersSell,
                onCancel,
            };
        },
    };
</script>

<template>
    <div class="row mt-2">
        <div class="col-md-6">
            <h5>Мои заявки на покупку</h5>

            <orders-list :orders="ordersBuy">
                <template v-slot:action="{ orderId, isLoading, status, credit, price }">
                    <div class="d-flex" v-if="status === 'success'">
                        <el-icon size="1.55rem" color="#AF0423"><success-filled /></el-icon>
                    </div>
                    <el-button
                        size="small"
                        type="danger"
                        icon="delete"
                        @click="onCancel(orderId, 'buy')"
                        :loading="isLoading"
                        v-if="status === null"
                    >
                        <el-icon><top /></el-icon> {{ credit }}Cr
                        <el-icon><bottom /></el-icon>{{ price }}Кг
                    </el-button>
                </template>
            </orders-list>
        </div>

        <div class="col-md-6">
            <h5>Мои заявки на продажу</h5>

            <orders-list :orders="ordersSell">
                <template v-slot:action="{ orderId, isLoading, status, credit, price }">
                    <div class="d-flex" v-if="status === 'success'">
                        <el-icon size="1.55rem" color="#AF0423"><success-filled /></el-icon>
                    </div>
                    <el-button
                        size="small"
                        type="danger"
                        icon="delete"
                        @click="onCancel(orderId, 'sell')"
                        :loading="isLoading"
                        v-if="status === null"
                    >
                        <el-icon><top /></el-icon> {{ credit }}Cr
                        <el-icon><bottom /></el-icon>{{ price }}Кг
                    </el-button>
                </template>
            </orders-list>
        </div>
    </div>
</template>

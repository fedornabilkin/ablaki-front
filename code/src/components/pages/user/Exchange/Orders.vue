<script>
    import { ref } from "@vue/reactivity";
    import OrdersList from "./OrdersList.vue";

    export default {
        components: { OrdersList },
        setup() {
            const ordersBuy = ref([
                {
                    id: 1,
                    rate: 0.03,
                    credit: 50,
                },
                {
                    id: 2,
                    rate: 0.029,
                    credit: 51,
                },
                {
                    id: 3,
                    rate: 0.0289,
                    credit: 60,
                },
                {
                    id: 4,
                    rate: 0.024,
                    credit: 100,
                },
            ]);

            const ordersSell = ref([
                {
                    id: 19,
                    rate: 10,
                    credit: 299,
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

            const onBuy = (id) => {
                let orderIndex = ordersBuy.value.findIndex((order) => order.id === id);

                ordersBuy.value[orderIndex].isLoading = true;

                setTimeout(() => {
                    ordersBuy.value[orderIndex].isLoading = false;
                    ordersBuy.value[orderIndex].status = "success";
                }, 1000);
            };

            const onSell = (id) => {
                let orderIndex = ordersSell.value.findIndex((order) => order.id === id);

                ordersSell.value[orderIndex].isLoading = true;

                setTimeout(() => {
                    ordersSell.value[orderIndex].isLoading = false;
                    ordersSell.value[orderIndex].status = "success";
                }, 1000);
            };

            return {
                ordersBuy,
                ordersSell,
                onBuy,
                onSell,
            };
        },
    };
</script>

<template>
    <div class="row mt-2">
        <div class="col-md-6">
            <h5>Купить кредиты</h5>

            <orders-list :orders="ordersBuy">
                <template v-slot:action="{ orderId, isLoading, status, credit, price }">
                    <div class="d-flex" v-if="status === 'success'">
                        <el-icon size="1.55rem" color="#AF0423"><success-filled /></el-icon>
                    </div>
                    <el-button
                        size="small"
                        icon="wallet"
                        @click="onBuy(orderId)"
                        :loading="isLoading"
                        v-if="status === null"
                    >
                        <el-icon><bottom /></el-icon> {{ credit }}Cr
                        <el-icon><top /></el-icon>{{ price }}Кг
                    </el-button>
                </template>
            </orders-list>
        </div>

        <div class="col-md-6">
            <h5>Продать кредиты</h5>

            <orders-list :orders="ordersSell">
                <template v-slot:action="{ orderId, isLoading, status, credit, price }">
                    <div class="d-flex" v-if="status === 'success'">
                        <el-icon size="1.55rem" color="#AF0423"><success-filled /></el-icon>
                    </div>
                    <el-button
                        size="small"
                        icon="wallet"
                        @click="onSell(orderId)"
                        :loading="isLoading"
                        v-if="status === null"
                    >
                        <el-icon><top /></el-icon> {{ credit }}Cr <el-icon><bottom /></el-icon>
                        {{ price }}Кг
                    </el-button>
                </template>
            </orders-list>
        </div>
    </div>
</template>

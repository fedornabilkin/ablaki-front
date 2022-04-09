<script>
    import { ref } from "@vue/reactivity";
    import NewOrder from "./NewOrder.vue";
    import OrdersList from "./OrdersList.vue";
    import { exchange } from '../../../../services/api';
    import { useFetchOrders } from './hooks/useFetchOrders';

    export default {
        components: { NewOrder, OrdersList },
        setup() {
            const {
                isloading: isloadingBuy,
                ordersList: ordersBuy
            } = useFetchOrders(exchange.getMyBuy);

            const {
                isloading: isloadingSell,
                ordersList: ordersSell
            } = useFetchOrders(exchange.getMySell);

            const onCancel = (id, type) => {
                if (type === "buy") {
                    let orderIndex = ordersBuy.value.findIndex((order) => order.id === id);
                    ordersBuy.value[orderIndex].isLoading = true;

                    exchange.cancel(id).then(res => {
                        ordersBuy.value[orderIndex].isLoading = false;
                        ordersBuy.value[orderIndex].status = "success";

                        ordersBuy.value.splice(orderIndex, 1);
                    });
                }
                
                if (type === "sell") {
                    let orderIndex = ordersSell.value.findIndex((order) => order.id === id);
                    ordersSell.value[orderIndex].isLoading = true;

                    exchange.cancel(id).then(res => {
                        ordersSell.value[orderIndex].isLoading = false;
                        ordersSell.value[orderIndex].status = "success";

                        ordersSell.value.splice(orderIndex, 1);
                    });
                }
            };

            return {
                isloadingBuy,
                isloadingSell,
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

            <orders-list :orders="ordersBuy" :isloading="isloadingBuy">
                <template v-slot:action="{ orderId, isLoading, status, credit, amount }">
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
                        <el-icon><bottom /></el-icon>{{ amount }}Кг
                    </el-button>
                </template>
            </orders-list>
        </div>

        <div class="col-md-6">
            <h5>Мои заявки на продажу</h5>

            <orders-list :orders="ordersSell" :isloading="isloadingSell">
                <template v-slot:action="{ orderId, isLoading, status, credit, amount }">
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
                        <el-icon><bottom /></el-icon> {{ amount }}Кг
                    </el-button>
                </template>
            </orders-list>
        </div>
    </div>
</template>

<script>
    import { ref } from "@vue/reactivity";
    import OrdersList from "./OrdersList.vue";
    import { errorHandler, exchange } from '../../../../services/api';
    import { useFetchOrders } from './hooks/useFetchOrders';
import { ElNotification } from 'element-plus';

    export default {
        components: { OrdersList },
        setup() {
            const {
                isloading: isloadingBuy,
                ordersList: ordersBuy
            } = useFetchOrders(exchange.getBuy);

            const {
                isloading: isloadingSell,
                ordersList: ordersSell
            } = useFetchOrders(exchange.getSell);

            const onBuy = (id) => {
                let orderIndex = ordersSell.value.findIndex((order) => order.id === id);

                ordersSell.value[orderIndex].isLoading = true;

                exchange.proceed(id).then(res => {
                    ordersSell.value[orderIndex].isLoading = false;
                    ordersSell.value[orderIndex].status = "success";
                }).catch(e => {
                    errorHandler(e, {
                        "Type is invalid.": () => ElNotification({
                            message: 'Type is invalid',
                            type: 'error',
                        })
                    });
                })
            };

            const onSell = (id) => {
                let orderIndex = ordersBuy.value.findIndex((order) => order.id === id);

                ordersBuy.value[orderIndex].isLoading = true;

                exchange.proceed(id).then(res => {
                    ordersBuy.value[orderIndex].isLoading = false;
                    ordersBuy.value[orderIndex].status = "success";
                });
            };

            return {
                isloadingBuy,
                isloadingSell,
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

            <orders-list :orders="ordersSell" :isloading="isloadingSell">
                <template v-slot:action="{ orderId, isLoading, status, credit, amount }">
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
                        <el-icon><top /></el-icon>{{ amount }}Кг
                    </el-button>
                </template>
            </orders-list>
        </div>

        <div class="col-md-6">
            <h5>Продать кредиты</h5>

            <orders-list :orders="ordersBuy" :isloading="isloadingBuy">
                <template v-slot:action="{ orderId, isLoading, status, credit, amount }">
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
                        <el-icon><top /></el-icon> {{ credit }}Cr
                        <el-icon><bottom /></el-icon> {{ amount }}Кг
                    </el-button>
                </template>
            </orders-list>
        </div>
    </div>
</template>

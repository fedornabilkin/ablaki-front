<template>
    <orders-list :orders="orders" :isLoading="isLoading">
        <template v-slot:action="{ orderId, credit, amount }">
            
        </template>
    </orders-list>
</template>

<script>
import { exchange } from '../../../../services/api';
import { useFetch } from '../../../../hooks/useFetch';
import OrdersList from './OrdersList.vue';

export default {
    components: { OrdersList },
    setup () {
        const { result: orders, isLoading } = useFetch(exchange.getHistory, []);

        return {
            orders,
            isLoading,
        }
    }
}
</script>

<style>

</style>
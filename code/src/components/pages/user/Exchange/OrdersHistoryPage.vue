<script>
import { exchange } from '../../../../services/api';
import { useFetch } from '../../../../hooks/useFetch';
import OrdersList from './OrdersList.vue';
import moment from 'moment';

export default {
    components: { OrdersList },
    setup () {
        const { result: orders, isLoading } = useFetch(exchange.getHistory, []);

        const formatDatetime = (timestamp) => {
            return moment(timestamp * 1000).format("DD.MM.YY HH:mm:ss")
        }

        return {
            orders,
            isLoading,
            formatDatetime,
        }
    }
}
</script>

<template>
    <orders-list :orders="orders" :isLoading="isLoading">
        <template v-slot:action="{ type, credit, amount, datetime }">
                
            <el-icon><bottom v-if="type === 'sell'" /><top v-else /></el-icon> {{ credit }}Cr
            <el-icon><top v-if="type === 'sell'" /><bottom v-else /></el-icon> {{ amount }}Кг

            <span class="created-date">{{ formatDatetime(datetime) }}</span>
        </template>
    </orders-list>
</template>

<style lang="scss" scoped>
.created-date {
    color: #666;
    font-size: 0.875em;
}
</style>
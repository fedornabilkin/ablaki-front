<script>
import { ref } from '@vue/reactivity';
import NewOrder from './NewOrder.vue';
import PageHeader from '../../../PageHeader.vue';
import { useRoute } from 'vue-router';
export default {
    components: { NewOrder, PageHeader },
    setup() {
        const newOrderDialog = ref(false);
        const viewRef = ref(null);
        const route = useRoute();

        const openNewOrderDialog = () => {
            newOrderDialog.value = true;
        };

        const closeNewOrderDialog = () => {
            newOrderDialog.value = false;
        };

        const onCreated = (type) => {
            closeNewOrderDialog();

            if (route.fullPath === "/exchange/my") {
                if (type === "buy") viewRef.value.refetchBuy();
                if (type === "sell") viewRef.value.refetchSell();
            }
        };

        return {
            viewRef,
            newOrderDialog,
            openNewOrderDialog,
            closeNewOrderDialog,
            onCreated,
        }
    },
}
</script>

<template>
    <page-header
        pageTitle="Биржа кредитов"
        :extraLinks="[
            {
                link: '/exchange',
                title: 'Все заявки',
            }, {
                link: '/exchange/my',
                title: 'Мои заявки',
            }, {
                link: '/exchange/history',
                title: 'История',
            }, 
        ]"
    >
        <template v-slot:actions>
            <el-button
                type="primary"
                @click="openNewOrderDialog"
                round
                icon="Plus"
                >Добавить заявку</el-button
            >
        </template>
    </page-header>

    <new-order
        :isOpen="newOrderDialog"
        @created="onCreated"
        @close="closeNewOrderDialog"
    />

    <div class="container">
        <router-view v-slot="{ Component }">
            <component :is="Component" ref="viewRef" />
        </router-view>
    </div>
</template>
<script>
import { ref } from '@vue/reactivity';
import NewOrder from './NewOrder.vue';
import PageHeader from '../../../PageHeader.vue';
export default {
    components: { NewOrder, PageHeader },
    setup() {
        const newOrderDialog = ref(false);

        const openNewOrderDialog = () => {
            newOrderDialog.value = true;
        };

        const closeNewOrderDialog = () => {
            newOrderDialog.value = false;
        };

        const onCreated = () => {
            closeNewOrderDialog();
            //reloadListTrigger.value = !reloadListTrigger.value;
        };

        return {
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
                link: '#',
                title: 'Удалить все заявки',
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
        <router-view />
    </div>
</template>
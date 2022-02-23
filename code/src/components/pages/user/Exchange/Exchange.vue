<script>
import { ref } from '@vue/reactivity';
import NewOrder from './NewOrder.vue';
export default {
    components: { NewOrder },
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

    <div class="row pt-2">
        <div class="col-sm">
            <div class="display-6">Биржа кредитов</div>
        </div>

        <div class="col-sm-auto mt-3 mt-sm-0">
            <el-button
                type="primary"
                @click="openNewOrderDialog"
                round
                icon="Plus"
                >Добавить заявку</el-button
            >
        </div>
    </div>

    <el-breadcrumb separator="/">
        <el-breadcrumb-item to="/exchange">
            <el-button type="text" icon="apple">Все заявки</el-button>
        </el-breadcrumb-item>

        <el-breadcrumb-item to="/exchange/my">
            <el-button type="text" icon="apple">Мои заявки</el-button>
        </el-breadcrumb-item>

        <el-breadcrumb-item to="/exchange">
            <el-button type="text" icon="apple">Удалить все заявки</el-button>
        </el-breadcrumb-item>
    </el-breadcrumb>

    <new-order
        :isOpen="newOrderDialog"
        @created="onCreated"
        @close="closeNewOrderDialog"
    />

    <router-view />
</template>
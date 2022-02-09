<script>
import { ref } from '@vue/reactivity';
import NewOrder from './NewOrder.vue';
export default {
    components: { NewOrder },
    setup() {
        const newOrderDialog = ref(false);

        let ordersBuy = ref([
            {
                id: 1,
                price: '0.03',
            },
            {
                id: 2,
                price: '0.029',
            },
            {
                id: 3,
                price: '0.0289',
            },
            {
                id: 4,
                price: '0.024',
            },
        ]);

        ordersBuy.value = ordersBuy.value.map(order => {
            return {
                ...order,
                isLoading: false,
                status: null,
            }
        });

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

        const onBuy = (id) => {
            let orderIndex = ordersBuy.value.findIndex((order) => order.id === id);

            ordersBuy.value[orderIndex].isLoading = true;
            
            setTimeout(() => {
                ordersBuy.value[orderIndex].isLoading = false;
                ordersBuy.value[orderIndex].status = "success";
            }, 1000);
        }

        let ordersSell = [];

        return {
            newOrderDialog,
            ordersBuy,
            ordersSell,
            openNewOrderDialog,
            closeNewOrderDialog,
            onCreated,
            onBuy,
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

    <div class="row mt-2">
        <div class="col-md-6">
            <h5>Купить кредиты</h5>

            <el-table :data="ordersBuy" stripe empty-text="Заявки не найдены">
                <el-table-column prop="id" label="ID" width="100" />
                <el-table-column prop="price" label="Цена за 1000" />
                <el-table-column label="" :cell-style="{display: 'flex'}">
                    <template #default="scope">
                        <div class="d-flex" v-if="scope.row.status === 'success'">
                            <el-icon size="1.55rem" color="#AF0423"><success-filled /></el-icon>
                        </div>
                        <el-button size="small" @click="onBuy(scope.row.id)" :loading="scope.row.isLoading" v-if="scope.row.status === null">Купить</el-button>
                    </template>
                </el-table-column>
            </el-table>
            
        </div>

        <div class="col-md-6">
            <h5>Продать кредиты</h5>

            <el-table :data="ordersSell" stripe empty-text="Заявки не найдены">
                <el-table-column prop="id" label="ID" width="100" />
                <el-table-column prop="price" label="Цена за 1000" />
                <el-table-column label="">
                    <template #default="scope">
                        <el-button size="small">Продать</el-button>
                    </template>
                </el-table-column>
            </el-table>
            
        </div>
    </div>
</template>
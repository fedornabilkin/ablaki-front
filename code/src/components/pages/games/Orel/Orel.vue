<script>
import { ref } from "@vue/reactivity";
import { watch } from "@vue/runtime-core";
import CreateGame from "./CreateGame.vue";

export default {
    components: {
        CreateGame,
    },
    setup() {
        const dialogCreate = ref(false);
        
        // триггер, заставляющий перезапросить инфу для страницы, который слушают все
        // страницы в дочернем router-view
        const reloadListTrigger = ref(false);

        const openDialogCreate = () => {
            dialogCreate.value = true;
        };

        const closeDialogCreate = () => {
            dialogCreate.value = false;
        };

        // при эмите инфы о том, что игра создана, дергаем триггер,
        // заставляя открытую страницу перезапросить данные
        const onGameCreated = () => {
            reloadListTrigger.value = !reloadListTrigger.value;
        };

        return {
            dialogCreate,
            openDialogCreate,
            closeDialogCreate,
            onGameCreated,
            reloadListTrigger,
        };
    },
};
</script>

<template>
    <div class="row mt-2">
        <div class="col-sm">
            <div class="display-6">Игра Орел-решка</div>
        </div>

        <div class="col-sm-auto mt-3 mt-sm-0">
            <el-button
                type="primary"
                @click="dialogCreate = true"
                round
                icon="Plus"
                >Создать игры</el-button
            >
        </div>
    </div>

    <div>
        <el-breadcrumb separator="/">
            <el-breadcrumb-item to="/games/orel">
                <el-button type="text" icon="apple">Все игры</el-button>
            </el-breadcrumb-item>

            <el-breadcrumb-item to="/games/orel/my">
                <el-button type="text" icon="apple">Мои игры</el-button>
            </el-breadcrumb-item>

            <el-breadcrumb-item to="/games/orel/history">
                <el-button type="text" icon="apple">История</el-button>
            </el-breadcrumb-item>
        </el-breadcrumb>
    </div>

    <create-game
        :isOpen="dialogCreate"
        @gameCreated="onGameCreated"
        @close="closeDialogCreate"
    />

    <router-view
        @newGameClick="openDialogCreate"
        :reloadListTrigger="reloadListTrigger"
    ></router-view>
</template>

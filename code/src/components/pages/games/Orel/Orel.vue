<script>
import { ref } from "@vue/reactivity";
import { watch } from "@vue/runtime-core";
import CreateGame from "./CreateGame.vue";
import PageHeader from '../../../PageHeader.vue';

export default {
    components: {
        CreateGame,
        PageHeader,
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
    <page-header
        pageTitle="Игра Орел-решка"
        :extraLinks="[
            {
                link: '/games/orel',
                title: 'Все игры',
            }, {
                link: '/games/orel/my',
                title: 'Мои игры',
            }, {
                link: '/games/orel/history',
                title: 'История',
            }, 
        ]"
    >
        <template v-slot:actions>
            <el-button
                type="primary"
                @click="dialogCreate = true"
                round
                icon="Plus"
                >Создать игры</el-button
            >
        </template>
    </page-header>

    <create-game
        :isOpen="dialogCreate"
        @gameCreated="onGameCreated"
        @close="closeDialogCreate"
    />

    <div class="container">
        <router-view
            @newGameClick="openDialogCreate"
            :reloadListTrigger="reloadListTrigger"
        />
    </div>
</template>

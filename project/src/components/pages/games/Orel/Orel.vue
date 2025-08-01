<script>
import { ref } from "@vue/reactivity";
import CreateGame from "../CreateGame.vue";
import PageHeader from '../../../PageHeader.vue';
import {orel} from '@/services/api/games/orel';

export default {
    components: { CreateGame, PageHeader, },

    setup() {
      const apiService = orel;

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
          apiService,
        };
    },
};
</script>

<template>
    <page-header
        pageTitle="Орел-решка"
        :extraLinks="[
            {
                link: '/games/orel',
                title: 'Все игры',
                icon: 'Coin',
            }, {
                link: '/games/orel/my',
                title: 'Мои игры',
                icon: 'User',
            }, {
                link: '/games/orel/history',
                title: 'История',
                icon: 'Calendar',
            }, 
        ]"
    >
        <template v-slot:actions>
            <el-button
                @click="dialogCreate = true"
                icon="Plus"
                type="success"
                ></el-button
            >
        </template>
    </page-header>

    <create-game
        :isOpen="dialogCreate"
        :konList="[10,20,50,100,200,500,1000]"
        :kon="5"
        :apiService="apiService"
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

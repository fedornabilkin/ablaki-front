<script setup>
import { ref } from "@vue/reactivity";
import CreateGame from "../CreateGame.vue";
import PageHeader from '../../../PageHeader.vue';
import {orel} from '@/services/api/games/orel';

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

const extraLinks = [
  {
    link: '/games/orel',
    title: 'Все игры',
    icon: 'fa fa-adjust',
  },
  {
    link: '/games/orel/my',
    title: 'Мои игры',
    icon: 'fa fa-user',
  },
  {
    link: '/games/orel/history',
    title: 'История',
    icon: 'fa fa-times-circle',
  },
]

const konList = [10,20,50,100,200,500,1000]

</script>

<template lang="pug">
  page-header(pageTitle='Орел-решка' :extraLinks='extraLinks')
    template(v-slot:actions='')
      el-button(@click='dialogCreate = true' icon='Plus' type='success')
  create-game(:isOpen='dialogCreate' :konList='konList' :kon='5' :apiService='apiService' @gameCreated='onGameCreated' @close='closeDialogCreate')
  .container
    router-view(@newGameClick='openDialogCreate' :reloadListTrigger='reloadListTrigger')

</template>

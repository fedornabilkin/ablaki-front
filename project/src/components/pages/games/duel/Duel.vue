<script setup lang="ts">
import { ref } from "@vue/reactivity";
import CreateDuelGame from "./CreateDuelGame.vue";
import PageHeader from '../../../PageHeader.vue';
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import GameToolbar from '../GameToolbar.vue';

const dialogCreate = ref(false);
const route = useRoute();
watch(() => route.query.create, value => { if (value === '1') dialogCreate.value = true; }, { immediate: true });

// триггер, заставляющий перезапросить инфу для страницы, который слушают все
// страницы в дочернем router-view
const reloadListTrigger = ref(false);

const openDialogCreate = () => {
  dialogCreate.value = true;
};

const closeDialogCreate = () => {
  dialogCreate.value = false;
};

const onGameCreated = () => {
  reloadListTrigger.value = !reloadListTrigger.value;
};

</script>

<template lang="pug">
  page-header(pageTitle='Дуэль')
    game-toolbar(kind="duel" @create="dialogCreate = true" @changed="onGameCreated")
  create-duel-game(:isOpen='dialogCreate' @gameCreated='onGameCreated' @close='closeDialogCreate')
  .container
    router-view(@newGameClick='openDialogCreate' :reloadListTrigger='reloadListTrigger')
</template>

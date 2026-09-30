<script setup lang="ts">
import { ref } from "@vue/reactivity";
import CreateDuelGame from "./CreateDuelGame.vue";
import PageHeader from '../../../PageHeader.vue';
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import GameToolbar from '../GameToolbar.vue';
import GamePageLayout from '../GamePageLayout.vue';

const dialogCreate = ref(false);
const route = useRoute();
watch(() => route.query.create, value => { if (value === '1') dialogCreate.value = true; }, { immediate: true });

// триггер, заставляющий перезапросить инфу для страницы, который слушают все
// страницы в дочернем router-view
const reloadListTrigger = ref(false);
const overviewVersion = ref(0);

const openDialogCreate = () => {
  dialogCreate.value = true;
};

const closeDialogCreate = () => {
  dialogCreate.value = false;
};

const onGameCreated = () => {
  reloadListTrigger.value = !reloadListTrigger.value;
  overviewVersion.value++;
};
const onGameChanged = () => { overviewVersion.value++; };

</script>

<template lang="pug">
  page-header(pageTitle='Дуэль')
    game-toolbar(kind="duel" @create="dialogCreate = true" @changed="onGameCreated")
  create-duel-game(:isOpen='dialogCreate' @gameCreated='onGameCreated' @close='closeDialogCreate')
  game-page-layout(kind="duel" :version="overviewVersion")
    router-view(@newGameClick='openDialogCreate' @changed="onGameChanged" :reloadListTrigger='reloadListTrigger')
</template>

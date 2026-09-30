<script setup lang="ts">
import { ref, shallowRef } from "@vue/reactivity";
import CreateDuelGame from "./CreateDuelGame.vue";
import PageHeader from '../../../PageHeader.vue';
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import GameToolbar from '../GameToolbar.vue';
import GamePageLayout from '../GamePageLayout.vue';
import { overviewSnapshot, type GameOverviewSnapshot } from '@/services/api/gameOverview';

const dialogCreate = ref(false);
const route = useRoute();
watch(() => route.query.create, value => { if (value === '1') dialogCreate.value = true; }, { immediate: true });

// триггер, заставляющий перезапросить инфу для страницы, который слушают все
// страницы в дочернем router-view
const reloadListTrigger = ref(false);
const overviewVersion = ref(0);
const snapshot = shallowRef<GameOverviewSnapshot | null>(null);

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
const onGamePlayed = (response: unknown) => {
  let next: GameOverviewSnapshot | null;
  try { next = overviewSnapshot(response); }
  catch { onGameChanged(); return; }
  if (next) snapshot.value = next;
  else onGameChanged();
};

</script>

<template lang="pug">
  page-header(pageTitle='Дуэль')
    game-toolbar(kind="duel" @create="dialogCreate = true" @changed="onGameCreated")
  create-duel-game(:isOpen='dialogCreate' @gameCreated='onGameCreated' @close='closeDialogCreate')
  game-page-layout(kind="duel" :version="overviewVersion" :snapshot="snapshot")
    router-view(@newGameClick='openDialogCreate' @changed="onGameChanged" @played="onGamePlayed" :reloadListTrigger='reloadListTrigger')
</template>

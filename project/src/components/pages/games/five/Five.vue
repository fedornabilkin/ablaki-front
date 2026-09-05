<script setup>
import { ref } from "@vue/reactivity";
import CreateFiveGame from "./CreateFiveGame.vue";
import PageHeader from '../../../PageHeader.vue';
import { NButton } from 'naive-ui';

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

const onGameCreated = () => {
  reloadListTrigger.value = !reloadListTrigger.value;
};

const extraLinks = [
  {
    link: '/games/five',
    title: 'Все игры',
    icon: 'fa fa-adjust',
  },
  {
    link: '/games/five/my',
    title: 'Мои игры',
    icon: 'fa fa-user',
  },
  {
    link: '/games/five/history',
    title: 'История',
    icon: 'fa fa-times-circle',
  },
]
</script>

<template lang="pug">
  page-header(pageTitle='Пять яблок' :extraLinks='extraLinks')
    template(v-slot:actions='')
      n-button(@click='dialogCreate = true' type='success')
        template(#icon)
          font-awesome-icon(icon='fa fa-plus')
  create-five-game(:isOpen='dialogCreate' @gameCreated='onGameCreated' @close='closeDialogCreate')
  .container
    .five-rules
      font-awesome-icon(icon='fa fa-apple-alt')
      | Каждый раунд оба игрока ставят от 1 до 5 яблок. Совпали числа — раунд вничью. Разница ровно в одно яблоко — меньшее число забирает сумму обоих очками. Иначе большее число забирает разность. Кто первым наберёт 21 очко — выигрывает партию и забирает банк (две ставки).
    router-view(@newGameClick='openDialogCreate' :reloadListTrigger='reloadListTrigger')
</template>

<style lang="scss" scoped>
.five-rules {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 1rem 0;
  color: var(--text-muted);
  line-height: 1.5;

  svg {
    color: var(--primary);
    flex-shrink: 0;
  }
}
</style>

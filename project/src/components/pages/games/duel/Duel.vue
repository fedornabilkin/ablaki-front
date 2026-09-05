<script setup>
import { ref } from "@vue/reactivity";
import CreateDuelGame from "./CreateDuelGame.vue";
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
    link: '/games/duel',
    title: 'Все схватки',
    icon: 'fa fa-adjust',
  },
  {
    link: '/games/duel/my',
    title: 'Мои схватки',
    icon: 'fa fa-user',
  },
  {
    link: '/games/duel/history',
    title: 'История',
    icon: 'fa fa-times-circle',
  },
]
</script>

<template lang="pug">
  page-header(pageTitle='Дуэль' :extraLinks='extraLinks')
    template(v-slot:actions='')
      n-button(@click='dialogCreate = true' type='success')
        template(#icon)
          font-awesome-icon(icon='fa fa-plus')
  create-duel-game(:isOpen='dialogCreate' @gameCreated='onGameCreated' @close='closeDialogCreate')
  .container
    .duel-rules
      font-awesome-icon(icon='fa fa-crosshairs')
      | Выбери удар по противнику и блок для себя: голова, корпус или ноги. Удар проходит, если противник не закрыл эту зону. Попал только один — он забирает банк (две ставки). Попали оба или оба удара в блок — ничья, ставки возвращаются.
    router-view(@newGameClick='openDialogCreate' :reloadListTrigger='reloadListTrigger')
</template>

<style lang="scss" scoped>
.duel-rules {
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

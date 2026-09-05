<script setup>
import PageHeader from "@/components/PageHeader.vue";
import CreateGame from "@/components/pages/games/CreateGame.vue";
import {saper} from "@/services/api/games/saper";
import PlayGame from "@/components/pages/games/saper/PlayGame.vue";
import {ref, h} from "vue";
import {SaperBuilder} from "@/entities/games/builder.js";
import {UserBuilder} from "@/entities/user/builder.js";
import {RouterLink} from 'vue-router';
import {NButton, NDataTable} from 'naive-ui';

const collection = ref([])
const currentGame = ref({id:0, kon:0})
const isLoading = ref(false)
const dialogPlay = ref(false)
const dialogCreate = ref(false)

const apiService = saper

const getUserName = (row) => {
  return row.created_by?.getUserName()
}

const createBuilder = () => {
  return new SaperBuilder({userBuilder: new UserBuilder()})
}

const getItems = () => {
  isLoading.value = true

  apiService.get()
    .then((response) => {
      const builder = createBuilder()
      builder.createCollection(response)
      collection.value = builder.getCollection()
    })
    .finally(() => {
      isLoading.value = false
    })
}

const btnPlay = (row) => {
  dialogPlay.value = true
  currentGame.value = row
}

const gameComplete = () => {
  console.log(currentGame)
}

getItems()

const extraLinks = [
  {
    link: '/games/saper',
    title: 'Все игры',
    icon: 'fa fa-apple-alt',
  }, {
    link: '/games/saper/my',
    title: 'Мои игры',
    icon: 'fa fa-user',
  }, {
    link: '/games/saper/history',
    title: 'История',
    icon: 'fa fa-times-circle',
  },
]

const columns = [
  { title: 'Id', key: 'id', width: 120, render: (row) => row.getId?.() ?? row.id },
  {
    title: 'Игрок',
    key: 'player',
    render: (row) => h(
      RouterLink,
      { to: '/wall/' + getUserName(row) },
      { default: () => getUserName(row) }
    ),
  },
  { title: 'Кон', key: 'kon', width: 60 },
  {
    title: '',
    key: 'actions',
    render: (row) => h(
      NButton,
      { type: 'success', onClick: () => btnPlay(row) },
      { default: () => 'Play' }
    ),
  },
]

</script>

<template lang="pug">
  page-header(pageTitle="Сапер" :extraLinks="extraLinks")
    template(v-slot:actions)
      n-button(type="success" @click="dialogCreate=true")
        template(#icon)
          font-awesome-icon(icon='fa fa-plus')

  .container
    n-data-table(:data="collection" :columns="columns" :loading="isLoading")

    create-game(
      :isOpen="dialogCreate"
      :konList="[1,2,3,5,7,10]"
      :kon="1"
      :apiService="apiService"
      @close="dialogCreate=false"
    )

    play-game(
      :isOpen="dialogPlay"
      :game="currentGame"
      :apiService="apiService"
      @close="dialogPlay=false"
      @gameComplete="gameComplete"
    )

</template>

<style></style>

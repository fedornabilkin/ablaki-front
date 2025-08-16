<script setup>
import PageHeader from "@/components/PageHeader.vue";
import CreateGame from "@/components/pages/games/CreateGame.vue";
import {saper} from "@/services/api/games/saper";
import PlayGame from "@/components/pages/games/saper/PlayGame.vue";
import {ref} from "@vue/reactivity";
import {SaperBuilder} from "@/entities/games/builder.js";
import {UserBuilder} from "@/entities/user/builder.js";

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
  currentGame.value = {id: row.id, kon: row.kon}
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
  // {
  //   link: '/games/saper/remove',
  //   title: 'Удалить',
  //   icon: 'DocumentDelete',
  //   type: 'danger',
  // },
]

</script>

<template lang="pug">
  page-header(pageTitle="Сапер" :extraLinks="extraLinks")
    template(v-slot:actions)
      el-button(icon="Plus" type="success" @click="dialogCreate=true")

  .container
    el-table(:data="collection" v-loading='isLoading')
      el-table-column(prop="id" label="Id" width="60")
      el-table-column(label="Игрок")
        template(#default="scope")
          router-link(:to="'/wall/' + getUserName(scope.row)") {{ getUserName(scope.row)}}
      el-table-column(prop="kon" label="Кон" width="60")
      el-table-column(label="")
        template(#default="scope")
          el-button(type="success" @click="btnPlay(scope.row)") Play

    create-game(
      :isOpen="dialogCreate"
      :konList="[1,2,3,5,7,10]"
      :kon="1"
      :apiService="apiService"
      @close="dialogCreate=false")

    play-game(
      :isOpen="dialogPlay"
      :game="currentGame"
      :apiService="apiService"
      @close="dialogPlay=false")

</template>

<style></style>

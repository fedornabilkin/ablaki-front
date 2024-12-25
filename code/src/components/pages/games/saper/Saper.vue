<template lang="pug">div
  page-header(pageTitle="Сапер" :extraLinks="extraLinks")
    template(v-slot:actions)
      el-button(icon="Plus" type="success" @click="dialogCreate=true")

  .container
    el-table(:data="collection")
      el-table-column(prop="id" label="Id" width="60")
      el-table-column(label="Игрок")
        template(#default="scope")
          | {{ getUserName(scope.row)}}
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

<script>
// @click="dialogCreate = true"
import PageHeader from "@/components/PageHeader.vue";
import CreateGame from "@/components/pages/games/CreateGame.vue";
import {saper} from "@/services/api/games/saper";
import {gameSaperStore} from "@/store/games/saper";
import PlayGame from "@/components/pages/games/saper/PlayGame.vue";

export default {

  name: "Saper",
  components: {CreateGame, PageHeader, PlayGame},

  data: () => ({
    collection: [],
    currentGame: {id:0, kon:0},
    exception: null,
    dialogCreate: false,
    dialogPlay: false,
    extraLinks: [
      {
        link: '/games/saper',
        title: 'Все игры',
        icon: 'Apple',
      }, {
        link: '/games/saper/my',
        title: 'Мои игры',
        icon: 'User',
      }, {
        link: '/games/saper/history',
        title: 'История',
        icon: 'Calendar',
      }, {
        link: '/games/saper/remove',
        title: 'Удалить',
        icon: 'DocumentDelete',
        type: 'danger',
      },
    ],
  }),

  setup() {
    const apiService = saper;
    const saperSore = gameSaperStore()

    return {apiService, saperSore}
  },

  mounted() {
    this.getItems();
  },

  computed: {
  //   extraLinks: () => ([
  //     {
  //       link: '/games/saper',
  //       title: 'Все игры',
  //     }, {
  //       link: '/games/saper/my',
  //       title: 'Мои игры',
  //     }, {
  //       link: '/games/saper/history',
  //       title: 'История',
  //     },
  //   ])
  },

  methods: {
    getUserName(row) {
      return row.created_by?.getUserName();
    },

    async getItems() {
      this.collection = await this.saperSore.getItems()
    },

    btnPlay(row) {
      this.dialogPlay=true
      this.currentGame = {id: row.id, kon: row.kon}
    },

  },

}
</script>

<style></style>

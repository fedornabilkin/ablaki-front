<template lang="pug">.container
  page-header(pageTitle="Сапер" :extraLinks="extraLinks")

    template(v-slot:actions)
      el-button(icon="Plus" @click="dialogCreate=true") Создать

  el-table(:data="collection")
    el-table-column(prop="id" label="Id" width="60")
    el-table-column(label="Игрок")
      template(#default="scope")
        | {{ scope.row.created_by?.getUserName()}}
    el-table-column(prop="kon" label="Кон" width="60")
    el-table-column(label="")
      template(#default)
        el-button(type="success") Play

  create-game(
    :isOpen="dialogCreate"
    :konList="[1,2,3,5,7,10]"
    :kon="1"
    :apiService="apiService"
    @close="dialogCreate=false")

</template>

<script>
// @click="dialogCreate = true"
import axios from "axios";
import config from "../../../../config/config";
import PageHeader from "@/components/PageHeader.vue";
import CreateGame from "@/components/pages/games/CreateGame.vue";
import {saper} from "@/services/api/games/saper";
import {SaperBuilder} from "@/entities/games/builder";
import {UserBuilder} from "@/entities/user/builder";

let urlMain = config.getParam('apiDomain');

export default {

  name: "Saper",
  components: {CreateGame, PageHeader},

  data: () => ({
    collection: [],
    exception: null,
    dialogCreate: false,
    extraLinks: [
      {
        link: '/games/saper',
        title: 'Все игры',
      }, {
        link: '/games/saper/my',
        title: 'Мои игры',
      }, {
        link: '/games/saper/history',
        title: 'История',
      },
    ],
  }),

  setup() {
    const apiService = saper;
    return {
      apiService,
    }
  },

  mounted() {
    this.getCollection();
  },

  // computed: {
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
  // },

  methods: {
    getUrlList: function () {
      return urlMain + 'v1/saper?sort=-id';
    },

    getCollection: function () {
      axios.get(this.getUrlList())
          .then(resp => {
            // this.gameList = resp.data;
            const builder = new SaperBuilder({userBuilder: new UserBuilder()})
            // const builder = new SaperBuilder()
            builder.createCollection(resp.data)
            this.collection = builder.getCollection()
          })
          .catch(err => {
            if (err.response) {
              this.exception = err.response.data;
            }
          })
    },

  },

}
</script>

<style></style>

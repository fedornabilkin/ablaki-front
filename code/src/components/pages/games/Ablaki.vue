<template>
    <div>
      Ablaki

      <div v-for="item in gameList" :key="item.id">
        {{ item.id }} {{ item.user_id }} {{ item.kon }}
      </div>
    </div>
</template>

<script>

import axios from "axios";
import config from "../../../config/config";

let urlMain = config.getParam('apiDomain');

export default {
  name: "Ablaki",
  data() {
    return {
      gameList: [],
      exception: null
    }
  },
  mounted() {
    this.requestList();
  },
  methods: {
    getUrlList: function () {
      return urlMain + 'v1/saper';
    },
    requestList: function () {
      axios.get(this.getUrlList())
          .then(resp => {
            // console.log(resp);
            if (resp.data !== undefined) {
              this.gameList = resp.data;
            }
          })
          .catch(err => {
            if (err.response) {
              this.exception = err.response.data;
            }
          })
    }
  }
}
</script>

<style scoped>

</style>

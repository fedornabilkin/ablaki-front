<template>
  <div v-if="wallUser.username">
    <div>Пользователь: {{ wallUser.username }}</div>
    <div>Rating: {{ wallUser.person.rating }}</div>
    <div>Refovod: {{ wallUser.person.refovod }}</div>
  </div>
  <div v-else-if="exception">
    <page-not-found :exception="exception"/>
  </div>
</template>

<script>
import axios from "axios";
import config from "../../../config/config";
import PageNotFound from "../PageNotFound";

let urlMain = config.getParam('apiDomain');

export default {
  name: "Wall",
  components: {
    PageNotFound
  },
  data() {
    return {
      wallUser: {
        person: {rating: 0, refovod: 0},
        username: ''
      },
      exception: null
    }
  },
  mounted() {
    this.wall();
  },
  methods: {
    getLogin: function () {
      return this.$route.params.login;
    },
    getWallUrl: function () {
      return urlMain + 'v1/users/wall/' + this.getLogin();
    },
    wall: function () {
      axios.get(this.getWallUrl())
          .then(resp => {
            // console.log(resp);
            if (resp.data.person !== undefined) {
              this.wallUser.person = resp.data.person;
              this.wallUser.username = resp.data.username;
            }
          })
          .catch((err, resp) => {
            if (err.response) {
              this.exception = err.response.data;
            }
            // console.log(err.response);
            // console.log(err.request);
          })
    }
  },
}
</script>

<style scoped>

</style>

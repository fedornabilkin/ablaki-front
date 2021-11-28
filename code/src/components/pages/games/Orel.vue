<template>
  <div>
    <h1>Orel</h1>

    <b-button v-on:click="" variant="primary">All</b-button>
    <b-button v-on:click="" variant="primary">My</b-button>
    <b-button v-on:click="" variant="primary">History</b-button>
    <b-button v-on:click="remove()" variant="danger">Remove all</b-button>

    <b-col md="3">
      <div v-for="item in gameList" :key="item.id">
        {{ item.id }}
        <router-link :to="'/users/wall/' + item.username">
          {{ item.username }}
        </router-link>
        {{ item.kon }}
        <b-button v-on:click="play(item.id, 1)" variant="success">O</b-button>
        <b-button v-on:click="play(item.id, 2)" variant="success">R</b-button>
        <b-button v-on:click="del(item.id)" variant="warning">D</b-button>
      </div>
    </b-col>
    <b-col md="3">
      <div v-for="item in gameListMy" :key="item.id">
        {{ item.id }}
        <router-link :to="'/users/wall/' + item.username">
          {{ item.username }}
        </router-link>
        {{ item.kon }}
        <b-button v-on:click="del(item.id)" variant="warning">D</b-button>
      </div>
    </b-col>
    <b-col md="3">
      <div v-for="item in gameListHistory" :key="item.id">
        {{ item.id }}
        <router-link :to="'/users/wall/' + item.username">
          {{ item.username }}
        </router-link>
        {{ item.kon }}
      </div>
    </b-col>


    <b-col md="6">
      <b-card>
        <h4 class="col-12 text-center">Создать</h4>
        <b-form @submit.prevent="create">
          <b-form-group
              class="position-relative"
              label="Ставка"
              label-for="kon">
            <b-form-input
                id="kon" type="number" step="1" min="1" max="100000"
                v-model="game.kon"
                required/>
            <div class="simple-kon">
                <span v-for="item in simple.kon" :key="item.valueOf()">
                  {{ item.valueOf() }}
                </span>
            </div>
          </b-form-group>

          <b-form-group
              class="position-relative"
              label="Количество"
              label-for="count">
            <b-form-input
                id="count" type="number" step="1" min="1" max="100"
                v-model="game.count"
                required
            />
            <div class="count">
                <span v-for="item in simple.count" :key="item.valueOf()">
                  {{ item.valueOf() }}
                </span>
            </div>
          </b-form-group>
          <b-form-group
              class="position-relative">
            <b-button
                v-if="!loading"
                type="submit"
                variant="primary">
              Создать
            </b-button>
          </b-form-group>
          <span v-if="loading"
                class="loading-text">Выполняется запрос...</span>
        </b-form>

      </b-card>
    </b-col>
  </div>
</template>

<script>

import axios from "axios";
import config from "../../../config/config";

export default {
  name: "Orel",
  data() {
    return {
      loading: false,
      gameList: [],
      gameListMy: [{id: 1, username: 'bot', kon: 23}],
      gameListHistory: [{id: 2, username: 'bot', kon: 23}],
      game: {
        kon: 5,
        count: 10
      },
      simple: {
        count: [3, 4, 5, 10, 20, 30, 50, 80, 100],
        kon: [10, 20, 50, 100, 200, 300, 500, 1000]
      },
      exception: null
    }
  },
  mounted() {
    this.requestList();
    this.requestMy();
    this.requestHistory();
  },
  methods: {
    gameUrl: function () {
      return 'v1/orel';
    },
    urlList: function () {
      return config.makeApiUrl(this.gameUrl());
    },
    urlPlay: function (id) {
      return config.makeApiUrl(this.gameUrl() + '/play/' + id);
    },
    urlDel: function (id) {
      return config.makeApiUrl(this.gameUrl() + id);
    },
    urlRemove: function () {
      return config.makeApiUrl(this.gameUrl() + '/remove');
    },
    urlCreate: function () {
      return config.makeApiUrl(this.gameUrl());
    },
    urlMy: function () {
      return config.makeApiUrl(this.gameUrl() + '/my');
    },
    urlHistory: function () {
      return config.makeApiUrl(this.gameUrl() + '/history');
    },
    create: function () {
      this.loading = true;
      axios.post(this.urlCreate(), this.game)
          .then(resp => {
            console.log(resp);
            if (resp.data !== undefined) {
              this.loading = false;
            }
          })
          .catch(err => {
            console.log(err.response);
            if (err.response) {
              this.exception = err.response.data;
            }
          })
    },
    play: function (id, type) {
      axios.post(this.urlPlay(id), {hod: type})
          .then(resp => {
            console.log(resp);
            if (resp.data !== undefined) {
            }
          })
          .catch(err => {
            console.log(err.response);
            if (err.response) {
              this.exception = err.response.data;
            }
          })
    },
    del: function (id) {
      axios.delete(this.urlDel(id))
          .then(resp => {
            console.log(resp);
            if (resp.data !== undefined) {
            }
          })
          .catch(err => {
            console.log(err.response);
            if (err.response) {
              this.exception = err.response.data;
            }
          })
    },
    remove: function () {
      axios.get(this.urlRemove())
          .then(resp => {
          })
          .catch(err => {
            if (err.response) {
              this.exception = err.response.data;
            }
          })
    },
    requestList: function () {
      axios.get(this.urlList())
          .then(resp => {
            if (resp.data !== undefined) {
              this.gameList = resp.data;
            }
          })
          .catch(err => {
            if (err.response) {
              this.exception = err.response.data;
            }
          })
    },
    requestMy: function () {
      axios.get(this.urlMy())
          .then(resp => {
            if (resp.data !== undefined) {
              this.gameListMy = resp.data;
            }
          })
          .catch(err => {
            if (err.response) {
              this.exception = err.response.data;
            }
          })
    },
    requestHistory: function () {
      axios.get(this.urlHistory())
          .then(resp => {
            if (resp.data !== undefined) {
              this.gameListHistory = resp.data;
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

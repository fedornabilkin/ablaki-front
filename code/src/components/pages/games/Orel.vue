<template>
  <div>
    Orel
    <b-col md="3">
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

    <div v-for="item in gameList" :key="item.id">
      {{ item.id }}
      <router-link :to="'/users/wall/' + item.username">
        {{ item.username }}
      </router-link>
      {{ item.kon }}
      <button v-on:click="play(item.id, 1)">O</button>
      <button v-on:click="play(item.id, 2)">R</button>
    </div>
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
  },
  methods: {
    urlList: function () {
      return config.makeApiUrl('v1/orel');
    },
    urlPlay: function (id) {
      return config.makeApiUrl('v1/orel/play/' + id);
    },
    urlCreate: function () {
      return config.makeApiUrl('v1/orel');
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
    }
  }
}
</script>

<style scoped>

</style>

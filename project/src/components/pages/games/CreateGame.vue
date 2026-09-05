<template lang="pug">
  n-modal(:show="isOpen" preset="card" title="Создать игры" style="max-width: 500px;" @update:show="(v) => v || closeDialog()")

    form(action="" class="form-newgame")
      div.row
        div(class="col-sm label") Ставка

        div.col-sm-auto
          n-input-number(v-model:value="kon" :min="1")

      div(class="fast-kon mt-2")
        div(v-for="btn in konList" :key="btn")
          n-button(type="info" size="small" :disabled="btn === kon" @click="fastKon(btn)") {{ btn }}

      div(class="row mt-4")
        div(class="col-sm label") Кол-во игр

        div.col-sm-auto
          n-input-number(v-model:value="count" :min="1")

      div(class="fast-kon mt-2")
        div(v-for="btn in countList" :key="btn")
          n-button(type="info" size="small" :disabled="btn === count" @click="fastCount(btn)") {{ btn }}

      div.mt-3
        n-button(type="primary" @click="createGame" :disabled="!btnActive" :loading="isLoading") Создать
</template>

<script>
import {NModal, NInputNumber, NButton, useNotification} from 'naive-ui';
import {errorHandler} from "@/services/api/errorHandler";
import {ref} from "@vue/reactivity";

export default {
    components: { NModal, NInputNumber, NButton },
    props: {
      isOpen: {type: Boolean, default: true,},
      konList: {type: Array, default: [1,2,3],},
      countList: {type: Array, default: [3,5,10,20,30,50,100],},
      kon: {type: Number, default: 1},
      count: {type: Number, default: 15},
      apiService: {type: Object, default: {}},
    },

  data: () => ({
    isLoading: false,
    btnActive: true,
  }),

    emits: ['close', 'gameCreated'],

    setup(props, { emit }) {
        const kon = ref(5);
        const count = ref(1);
        const notification = useNotification();

        const closeDialog = () => {
            emit('close');
        };

      return {kon, count, closeDialog, notification}
    },

  methods: {
    fastKon(value) {
      this.kon = value
    },

    fastCount(value) {
      this.count = value
    },

    createGame() {
      this.isLoading = true;
      const notify = {type: 'error', message: 'Что-то пошло не так'}
      this.apiService.create(this.kon, this.count)
          .then(() => {
            notify.message = 'Игры созданы'
            notify.type = 'success'

            this.$emit("gameCreated")
          })
          .catch((err) => {
            notify.type = 'warning'
            errorHandler(err, (msg) => notify.message = msg)
          })
          .finally(() => {
            this.isLoading = false
            const type = ['info', 'success', 'warning', 'error'].includes(notify.type) ? notify.type : 'info';
            this.notification[type]({
              content: notify.message,
              duration: 4500,
            })
          })
    }
  },

};
</script>

<style lang="scss" scoped>
    .form-newgame {
        .label {
            display: flex;
            align-items: center;
        }

        .fast-kon {
            display: flex;
            justify-content: flex-start;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
    }
</style>

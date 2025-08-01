<template lang="pug">
  el-dialog(
      :model-value="isOpen"
      title="Создать игры"
      destroy-on-close
      @close="closeDialog")

    form(action="" class="form-newgame")
      div.row
        div(class="col-sm label") Ставка

        div.col-sm-auto
          el-input-number(v-model="kon" :min="1" controls-position="right")

      div(class="fast-kon mt-2")
        div(v-for="btn in konList" :key="btn")
          el-button(type="info" size="small" :disabled="btn === kon" @click="fastKon(btn)") {{ btn }}

      div(class="row mt-4")
        div(class="col-sm label") Кол-во игр

        div.col-sm-auto
          el-input-number(v-model="count" :min="1" controls-position="right")

      div(class="fast-kon mt-2")
        div(v-for="btn in countList" :key="btn")
          el-button(type="info" size="small" :disabled="btn === count" @click="fastCount(btn)") {{ btn }}

      div.mt-3
        el-button(type="primary" @click="createGame" :disabled="!btnActive" :loading="isLoading") Создать
</template>

<script>
import {ElNotification} from 'element-plus';
import {errorHandler} from "@/services/api/errorHandler";
import {ref} from "@vue/reactivity";

export default {
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

        const closeDialog = () => {
            emit('close');
        };

      return {kon, count, closeDialog}
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
      this.apiService.create(this.kon, this.count)
          .then((res) => {
            ElNotification({
              message: 'Игры созданы',
              type: 'success',
            });
            this.isLoading = false;

            emit("gameCreated");
          })
          .catch((err) => {
            errorHandler(err, {
              "Insufficient funds": () => {
                ElNotification({
                  message: 'Недостаточно средств на балансе',
                  type: 'error',
                });

                this.isLoading = false;
              }
            });
          });
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

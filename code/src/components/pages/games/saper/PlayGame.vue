<script>
import {ElNotification} from "element-plus";

export default {
  props: {
    isOpen: {type: Boolean, default: true,},
    apiService: {type: Object, default: {}},
  },

  data: () => ({
    isLoading: false,
    btnActive: true,
    game: {id:1, kon:0},
    tableData: [],
  }),

  setup() {

    return {}
  },

  mounted() {
    this.createGameArray()
  },

  computed: {
    title() {
      return `Игра: ${this.game.id} Ставка: ${this.game.kon}`
    },
  },

  methods: {
    createGameArray() {
      this.tableData = Array(5).fill().map(() =>
          Array(7).fill().map(() => ({
            type: 'success',
            isClick: false
          }))
      );
    },

    getType(i, k) {
      let row = i-1
      let col = k-1
      let element = this.tableData[row][col]
      return element?.type
    },

    clickElement(i, k) {
      let row = i-1
      let col = k-1
      let element = this.tableData[row][col]
      element.type = 'warning'
      element.isClick = true
    },

    startGame() {
      this.isLoading = true;
      this.apiService.start(this.game.id)
          .then((res) => {
            this.createGameArray()
          })
          .catch((err) => {})
          .finally(() => {
            this.isLoading = false
          })
    },

    playGame(row, col) {
      this.isLoading = true;
      this.apiService.play(this.game.id, row, col)
          .then((res) => {

          })
          .catch((err) => {console.log(err.response.data)})
          .finally(() => {
            this.isLoading = false
            this.clickElement(row, col)
          })
    }
  },

};
</script>

<template lang="pug">
  el-dialog(
    :model-value="isOpen"
    :title="title"
    destroy-on-close
    @close="closeDialog")

    table
      tr(v-for="i in 5" :key="i")
        td(v-for="k in 7" :key="k")
          el-button(icon="Apple" :type="getType(i, k)" @click="playGame(i, k)")

    div.mt-3
      el-button(type="primary" @click="startGame" :disabled="!btnActive" :loading="isLoading") Начать
</template>

<style scoped lang="scss">

</style>
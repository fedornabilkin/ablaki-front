<script>
export default {
  props: {
    isOpen: {type: Boolean, default: true,},
    apiService: {type: Object, default: {}},
    game: {type: Object, default: {id:0, kon:0}},
  },

  data: () => ({
    isLoading: false,
    btnActive: true,
    tableData: [],
    response: '',
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
    handleOpen() {
      this.setResponse('')
      this.createGameArray()
    },

    createGameArray() {
      this.tableData = Array(5).fill().map(() =>
          Array(7).fill().map(() => ({
            type: 'default',
            isClick: false,
            isLoading: false,
          }))
      );
    },

    getType(i, k) {
      let element = this.tableData[i-1][k-1]
      return element?.type
    },

    getLoading(i, k) {
      let element = this.tableData[i-1][k-1]
      return element?.isLoading
    },

    getClickElement(i, k) {
      return this.tableData[i-1][k-1]
    },

    setResponse(msg) {
      this.response = msg
    },

    checkState(data) {
      console.log(data)
    },

    startGame() {
      this.setResponse('')
      this.isLoading = true;
      this.apiService.start(this.game.id)
          .then((res) => {
            this.createGameArray()
          })
          .catch((err) => {
            this.setResponse(err.response.data.message)
          })
          .finally(() => {
            this.isLoading = false
          })
    },

    playGame(row, col) {
      this.setResponse('')
      let element = this.getClickElement(row, col)
      element.isLoading = true
      element.isClick = true

      this.apiService.play(this.game.id, row, col)
          .then((res) => {
            element.type = 'success'
            this.checkState(res)
          })
          .catch((err) => {
            element.type = 'warning'
            this.setResponse(err.response.data.message)
            console.log(err.response.data)
          })
          .finally(() => {
            element.isLoading = false
          })
    }
  },

};
</script>

<template lang="pug">
  el-dialog(
    top="3rem"
    :model-value="isOpen"
    :title="title"
    :modal="false"
    destroy-on-close
    @close="closeDialog"
    @open="handleOpen")

    table
      tr(v-for="i in 5" :key="i")
        td(v-for="k in 7" :key="k")
          el-button(icon="Apple" :type="getType(i, k)" @click="playGame(i, k)" :loading="getLoading(i, k)")

    div.mt-3
      el-button(type="primary" @click="startGame" :disabled="!btnActive" :loading="isLoading") Начать
      .d-inline.mx-1 {{response}}
</template>

<style scoped lang="scss">

</style>
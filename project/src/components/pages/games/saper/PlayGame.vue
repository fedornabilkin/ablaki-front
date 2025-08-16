<script setup>

import {ref, computed} from "@vue/reactivity";
import {onMounted} from "vue";

const props = defineProps(['isOpen', 'apiService', 'game'])
const emit = defineEmits(['gameComplete'])

const isLoading = ref(false)
const btnActive = ref(true)
const tableData = ref([])
const response = ref('')

onMounted(() => {
  createGameArray()
})

const title = computed(() => {
  return `Игра: ${props.game.id} Ставка: ${props.game.kon}`
})

const createGameArray = () => {
  tableData.value = Array(5).fill().map(() =>
      Array(7).fill().map(() => ({
        type: 'default',
        isClick: false,
        isLoading: false,
      }))
  );
}

const setResponse = (msg) => {
  response.value = msg
}

const handleOpen = () => {
  isLoading.value = false
  btnActive.value = true
  setResponse('')
  createGameArray()
}

const getType = (i, k) => {
  let element = tableData.value[i-1][k-1]
  return element?.type
}

const getLoading = (i, k) => {
  let element = tableData.value[i-1][k-1]
  return element?.isLoading
}

const getClickElement = (i, k) => {
  return tableData.value[i-1][k-1]
}

const checkState = (data) => {
  console.log(data)
}

const startGame = () => {
  setResponse('')
  isLoading.value = true;
  props.apiService.start(props.game.id)
      .then(() => {
        createGameArray()
      })
      .catch((err) => {
        setResponse(err.response.data.message)
        checkState(err.response)
      })
      .finally(() => {
        isLoading.value = false
        btnActive.value = false
      })
}

const playGame = (row, col) => {
  setResponse('')
  const element = getClickElement(row, col)
  element.isLoading = true
  element.isClick = true

  props.apiService.play(props.game.id, row, col)
      .then((res) => {
        element.type = 'success'
        checkState(res)
        if (row === 1) {
          emit('gameComplete')
        }
      })
      .catch((err) => {
        element.type = 'warning'
        setResponse(err.response.data.message)
        checkState(err.response)
        emit('gameComplete')
      })
      .finally(() => {
        element.isLoading = false
      })
}

</script>

<template lang="pug">
  el-dialog(
    top="3rem"
    :model-value="props.isOpen"
    :title="title"
    :modal="false"
    destroy-on-close
    @close="closeDialog"
    @open="handleOpen")

    table
      tr(v-for="i in 5" :key="i")
        td(v-for="k in 7" :key="k")
          el-button(class="play-game" icon="Apple" :type="getType(i, k)" @click="playGame(i, k)" :loading="getLoading(i, k)")

    div.mt-3
      el-button(type="primary" @click="startGame" :disabled="!btnActive" :loading="isLoading") Начать
      .d-inline.mx-1 {{response}}
</template>

<style scoped lang="scss">
 .play-game {max-width: 2.7rem}
</style>
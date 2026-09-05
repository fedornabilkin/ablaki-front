<script lang="ts" setup>
import PageHeader from "@/components/PageHeader.vue";
import {ref, h} from 'vue'
import {RouterLink} from 'vue-router'
import {themeApi} from "@/services/api/forum";
import {ForumThemeBuilder} from "@/entities/forum/builder"
import {
  NForm,
  NFormItem,
  NInput,
  NButton,
  NDataTable,
} from 'naive-ui'

const isLoading = ref(false)
const loadingData = ref(false)
const btnActive = ref(false)
const item = ref({title:'', comment:''})
const themesList = ref([])

let builder: ForumThemeBuilder;
builder = new ForumThemeBuilder();

const fetchThemes = () => {
  loadingData.value = true
  themeApi.index()
    .then((response) => {
      builder.createCollection(response)
      themesList.value = builder.getCollection()
    })
    .catch((err) => {
      console.log(err)
    })
      .finally(() => loadingData.value = false)
}

fetchThemes()

const saveItem = () => {
  if (item.value.title === '') {
    return
  }
  isLoading.value = true
  themeApi.create(item.value.title, item.value.comment)
      .then((response) => {
        builder.build(response)
        themesList.value.unshift(builder.getEntity())
      })
      .catch((err) => {
        console.log(err)
      })
      .finally(() => isLoading.value = false)
  return false
}

const extraLinks = [
  {
    link: '/forum',
    title: 'Все темы',
  }, {
    link: '/forum/my',
    title: 'Мои темы',
  },
]

const columns = [
  { title: '#', key: 'id', width: 60, render: (row: any) => row.getId?.() ?? row.id },
  {
    title: 'Название',
    key: 'name',
    width: 250,
    render: (row: any) => h(
      RouterLink,
      { to: '/forum/read/' + (row.getId?.() ?? row.id) },
      { default: () => row.getName?.() ?? row.name }
    ),
  },
  { title: 'Дата', key: 'created_at_format', width: 160 },
]

</script>

<template lang="pug">
  page-header(pageTitle="Форум" :extraLinks="extraLinks")
  .container
    n-form(inline :model="item" @submit.prevent="saveItem()")
      n-form-item
        n-input(v-model:value="item.title" placeholder="Название темы" clearable)
      n-form-item
        n-button(type="success" :loading='isLoading' @click="saveItem") Создать

    n-data-table(:loading="loadingData" :data='themesList' :columns="columns" :max-height='450' style="width: 100%")


</template>

<style scoped>

</style>

<script lang="ts" setup>
import PageHeader from "@/components/PageHeader.vue";
import {ref} from 'vue'
import {themeApi} from "@/services/api/forum";
import {ForumThemeBuilder} from "@/entities/forum/builder"

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

</script>

<template lang="pug">
  page-header(pageTitle="Форум" :extraLinks="extraLinks")
  .container
    //el-collapse(v-model='collapseCreate')
      el-collapse-item(title='Создать' name='create')
        form.form
          .row
            .col-sm.label Тема
            .col-sm
              el-input(v-model='title')
          .row.mt-4
            .col-sm.label Комментарий
            .col-sm
              el-input(v-model='comment' type='textarea')
          .mt-3
            el-button(type='primary' @click='create' :disabled='!btnActive' :loading='isLoading') Создать

    el-form(:inline="true" :model="item" @submit.prevent="saveItem()")
      el-form-item
        el-input(v-model="item.title" placeholder="Название темы" clearable)
      //el-form-item
        el-input(v-model="item.comment" placeholder="Сообщение" clearable)
      el-form-item
        el-button(type="success" :loading='isLoading' @click="saveItem") Создать

    el-table(v-loading="loadingData" :data='themesList' stripe height='450' style="width: 100%")
      el-table-column(prop='id' label='#' width='60')
      el-table-column(prop='name' label='Название' width='250')
        template(#default="scope")
          router-link(:to="'/forum/read/' + scope.row.getId()")
            el-link {{scope.row.getName()}}
      el-table-column(prop='created_at_format' label='Дата' width='160')


</template>

<style scoped>

</style>

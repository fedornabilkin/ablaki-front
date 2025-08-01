<script lang="ts" setup>
import PageHeader from "@/components/PageHeader.vue";
import {ref} from 'vue'
import {themeApi} from "@/services/api/forum";
import {ForumThemeBuilder} from "@/entities/forum/builder"

const collapseCreate = ref(false)
const isLoading = ref(false)
const btnActive = ref(false)
const title = ref('')
const comment = ref('')
const themesList = ref([])

let builder: ForumThemeBuilder;
builder = new ForumThemeBuilder();

const fetchThemes = () => {
  themeApi.index()
      .then((response) => {
        builder.createCollection(response)
        themesList.value = builder.getCollection()
      })
      .catch((err) => {
        console.log(err)
      })
}

fetchThemes()

const create = () => {
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
  page-header(pagetitle='Форум' :extralinks='extraLinks')
  .container
    el-collapse(v-model='collapseCreate')
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

    el-table(:data='themesList' stripe height='450')
      el-table-column(prop='id' label='#' width='60')
      el-table-column(prop='name' label='Название' width='250')
        template(#default="scope")
          router-link(:to="'/forum/read/' + scope.row.getId()")
            el-link {{scope.row.getName()}}
      el-table-column(prop='created_at_format' label='Дата' width='160')


</template>

<style scoped>

</style>

<script lang="ts" setup>
import PageHeader from "@/components/PageHeader.vue";
import {ref} from "vue";
import {commentApi, themeApi} from "@/services/api/forum";
import {useRoute} from "vue-router";
import {ForumThemeBuilder, ForumCommentBuilder} from "@/entities/forum/builder"
import {UserBuilder} from "@/entities/user/builder"
import {
  NForm,
  NFormItem,
  NInput,
  NButton,
  NDataTable,
} from 'naive-ui'

const theme = ref({});
const comments = ref([]);
const isLoading = ref(false)
const loadingData = ref(false)
const route = useRoute();
const themeId = route.params.theme_id;
const item = ref({comment:'', theme_id: themeId-0})

const userBuilder: UserBuilder = new UserBuilder()
const themeBuilder: ForumThemeBuilder = new ForumThemeBuilder()
theme.value = themeBuilder.getEntity()
const commentBuilder: ForumCommentBuilder = new ForumCommentBuilder({userBuilder: userBuilder})

const fetchTheme = () => {
  themeApi.view(themeId)
      .then((response: []) => {
        themeBuilder.build(response)
        theme.value = themeBuilder.getEntity()
      })
      .catch((err) => {
        console.log(err);
      });
};

const fetchComments = () => {
  loadingData.value = true
  commentApi.index(themeId)
      .then((response: []) => {
        commentBuilder.createCollection(response)
        comments.value = commentBuilder.getCollection()
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => loadingData.value = false)
};

fetchTheme();
fetchComments();

const saveItem = () => {
  if (item.value.comment === '' || item.value.theme_id < 1) {
    return
  }
  isLoading.value = true
  commentApi.create(item.value.comment, item.value.theme_id)
      .then((response) => {
        commentBuilder.build(response)
        comments.value.unshift(commentBuilder.getEntity())
        item.value.comment = ''
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
  { title: 'Автор', key: 'author', width: 120, render: (row: any) => row?.created_by?.getUserName?.() ?? '' },
  { title: 'Комментарий', key: 'comment', width: 450, render: (row: any) => row.getComment?.() ?? row.comment },
  { title: 'Дата', key: 'created_at_format', width: 160 },
]

</script>

<template lang="pug">
  page-header(:pageTitle="theme.getName()" :extraLinks="extraLinks")
  .container
    n-form(inline :model="item" @submit.prevent="saveItem()")
      n-form-item
        n-input(v-model:value="item.comment" type="textarea" placeholder="Сообщение" clearable)
      n-form-item
        n-button(type="success" :loading='isLoading' @click="saveItem") Создать

    n-data-table(:loading="loadingData" :data='comments' :columns="columns" :max-height='450' style="width: 100%")

</template>

<style scoped>

</style>

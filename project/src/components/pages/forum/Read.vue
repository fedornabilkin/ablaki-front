<script lang="ts" setup>
import PageHeader from "@/components/PageHeader.vue";
import {ref} from "vue";
import {commentApi, themeApi} from "@/services/api/forum";
import {useRoute} from "vue-router";
import {ForumThemeBuilder, ForumCommentBuilder} from "@/entities/forum/builder"
import {UserBuilder} from "@/entities/user/builder"

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

</script>

<template lang="pug">
  page-header(:pageTitle="theme.getName()" :extraLinks="extraLinks")
  .container
    //.row
      .col-sm {{theme.getName()}}

    el-form(:inline="true" :model="item" @submit.prevent="saveItem()")
      el-form-item
        el-input(v-model="item.comment" type="textarea" placeholder="Сообщение" clearable)
      el-form-item
        el-button(type="success" :loading='isLoading' @click="saveItem") Создать

    el-table(v-loading="loadingData" :data='comments' stripe height='450' style="width: 100%")
      el-table-column(prop='id' label='#' width='60')
      el-table-column(label='Автор' width='120')
        template(#default="scope")
          | {{scope.row?.created_by?.getUserName()}}
      el-table-column(prop='name' label='Комментарий' width='450')
        template(#default="scope")
          | {{scope.row.getComment()}}
      el-table-column(prop='created_at_format' label='Дата' width='160')

</template>

<style scoped>

</style>

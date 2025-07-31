<script lang="ts" setup>
import PageHeader from "@/components/PageHeader.vue";
import {ref} from "vue";
import {commentApi, themeApi} from "@/services/api/forum";
import {useRoute} from "vue-router";
import {ForumThemeBuilder, ForumCommentBuilder} from "@/entities/forum/builder"
import {UserBuilder} from "@/entities/user/builder"

const theme = ref({});
const comments = ref([]);
const route = useRoute();
const themeId = route.params.theme_id;

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
  commentApi.index(themeId)
      .then((response: []) => {
        commentBuilder.createCollection(response)
        comments.value = commentBuilder.getCollection()
      })
      .catch((err) => {
        console.log(err);
      });
};

fetchTheme();
fetchComments();

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
    .row
      .col-sm {{theme.getName()}}

    el-table(:data='comments' stripe height='450')
      el-table-column(prop='id' label='#' width='60')
      el-table-column(label='Автор' width='120')
        template(#default="scope")
          | {{scope.row.created_by.getUserName()}}
      el-table-column(prop='name' label='Комментарий' width='250')
        template(#default="scope")
          | {{scope.row.getComment()}}
      el-table-column(prop='created_at_format' label='Дата' width='160')

</template>

<style scoped>

</style>

<script>
import PageHeader from "../../PageHeader.vue";
import {ref} from "vue";
import {commentApi, themeApi} from "../../../services/api/forum";
import {useRoute} from "vue-router";

export default {
    name: "Read",
    components: {PageHeader},
    setup(){
      const theme = ref({});
      const comments = ref([]);
      const route = useRoute();
      const theme_id = route.params.theme_id;

      const fetchTheme = () => {
        themeApi.view(theme_id)
            .then((res) => {
              theme.value = res
            })
            .catch((res) => {
              console.log(err);
            });
      };

      const fetchComments = () => {
        commentApi.index(theme_id)
            .then((res) => {
              comments.value = res;
            })
            .catch((err) => {
              console.log(err);
            });
      };

      fetchTheme();
      fetchComments();

      return {
        comments: comments,
        theme: theme,
      }
    },
  }
</script>

<template>

  <page-header
      pageTitle="Форум"
      :extraLinks="[
            {
                link: '/forum',
                title: 'Все темы',
            }, {
                link: '/forum/my',
                title: 'Мои темы',
            },
        ]"
  >

  </page-header>

  <div class="container">
    <div class="row">
      <div class="col-sm">{{theme.title}}</div>
    </div>
    <div class="row mt-2 border-top" v-for="comment in comments" :key="comment.id">
      <div class="col-sm">{{comment.user.username}} ({{comment.user.person.rating}})</div>
      <div class="col-sm">({{comment.id}}) {{comment.comment}}</div>
    </div>
  </div>

</template>

<style scoped>

</style>

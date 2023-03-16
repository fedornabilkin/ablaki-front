<script>
import PageHeader from "../../PageHeader.vue";
import {ref} from 'vue'
import {themeApi} from "../../../services/api/forum";

const collapseCreate = ref(['create'])

    export default {
      name: "Forum",
      components: {PageHeader},
      setup(){
        const themesList = ref([]);

        const fetchThemes = () => {
          themeApi.index()
              .then((res) => {
                themesList.value = res;
              })
              .catch((err) => {
                console.log(err);
              });
        };

        fetchThemes();

        return {
          themesList
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
  <el-collapse v-model="collapseCreate">
    <el-collapse-item title="Создать" name="create">
      <form action="" class="form">
        <div class="row">
          <div class="col-sm label">Новая тема</div>

          <div class="col-sm">
            <el-input v-model="title" />
          </div>
        </div>

        <div class="row mt-4">
          <div class="col-sm label">Комментарий</div>

          <div class="col-sm">
            <el-input v-model="comment" type="textarea" />
          </div>
        </div>


        <div class="mt-3">
          <el-button type="primary"
                     @click="create"
                     :disabled="!btnActive"
                     :loading="isLoading"
          >Создать</el-button>
        </div>
      </form>
    </el-collapse-item>
  </el-collapse>
  <div class="row" v-for="theme in themesList" :key="theme.id">
    <div class="col-sm">
      <router-link :to="'/forum/read/' + theme.id">
        <el-link>{{theme.title}}</el-link>
      </router-link>
    </div>
  </div>
</div>


</template>

<style scoped>

</style>

<script setup>
import { ref } from "vue";
import { useRoute } from 'vue-router';
import { getWall } from '@/services/api.js';
import PageHeader from "@/components/PageHeader.vue";
import {UserBuilder} from "@/entities/user/builder.js";

const route = useRoute()

const user = ref(null)
const isLoading = ref(true)

getWall(route.params.login)
    .then(response => {

      const builder = new UserBuilder()
      builder.createForWall(response)
      user.value = builder.getEntity()
    })
    .finally(() => {
      isLoading.value = false
    })

const wallTitle = (user) => {
  return `Стена пользователя ${user.getUserName()}`
}

const extraLinks = [
  // {
  //   link: `/wall/${wall.username}`,
  //   title: 'Стена',
  // },
  // {
  //   link: `/messages/${wall.username}`,
  //   title: 'Сообщение',
  // },
  // {
  //   link: `#`,
  //   title: 'Подписаться',
  // }
]

</script>

<template lang="pug">
  div(v-loading='isLoading')
    template(v-if='user')
      page-header(:pageTitle='wallTitle(user)' :extraLinks='extraLinks')
      .container.py-4
        .row
          .col-md-4
            el-card(shadow='never')
              el-avatar.user-avatar(shape='square' fit='cover' src='https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg')
          .col-md-8
            el-card(v-if="user" shadow='never')
              .row
                .col Регистрация
                .col-auto {{ user.created_at_format }}
              .row
                .col Последняя активность
                .col-auto {{ user.last_login_at }}
              .row
                .col Рейтинг
                .col-auto {{ user.person.getRating() }}
              .row
                .col Количество бонусов рейтинга
                .col-auto {{ user.person.getBonusRatingCount() }}
              .row.mt-3(v-if="user.person.isRefovod()")
                .col Рефовод
                .col-auto Есть
        .row
          .col {{ user.person.getDescription() }}
</template>

<style lang="scss" scoped>
    .user-avatar {
        width: 100%;min-height: 150px;
    }
</style>
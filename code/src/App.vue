<template lang="pug">main
  nav-bar

  div(v-if="dataFetched")
  //user-bar(v-if="isAuthenticated")

  side-bar(v-if="isAuthenticated")

  router-view

</template>

<script>
import UserBar from "./components/navbar/UserBar.vue"
import NavBar from "./components/navbar/NavBar.vue";
import SideBar from "./components/navbar/SideBar.vue";

import axios from 'axios';
import {getProfile} from './services/api.js';
import {mapGetters} from 'vuex';

export default {
  name: 'App',
  components: {
    NavBar,
    UserBar,
    SideBar,
  },

  created: function () {
    if (this.$store.state.auth.token) {
      axios.defaults.headers.common['Authorization'] = this.headerToken;
    }

    this.$store.dispatch('auth/fetchData').catch(e => {
      this.$router.push('/')
    });
  },
  watch: {
    'headerToken': function () {
      axios.defaults.headers.common['Authorization'] = this.headerToken;
    }
  },
  computed: {
    ...mapGetters('auth', [
      'isAuthenticated',
      'headerToken',
      'user',
      'authStatus',
    ]),
    dataFetched() {
      return this.authStatus !== null
    },
  },

  mounted() {
    console.log('mounted')
    console.log(import.meta.env)
    // if (this.loading) {
    //     this.menuList.push({anchor: 'Статистика', url: '/statistic', title: '', icon: 'user'});
    //     this.menuList.push({anchor: 'Биржа кредитов', url: '/exchange', title: '', icon: 'user'});
    //     this.menuList.push({anchor: 'Перевод кредитов', url: '/transfer', title: '', icon: 'user'});
    //     this.menuList.push({anchor: 'История баланса', url: '/balance', title: '', icon: 'user'});
    //     this.menuList.push({anchor: 'Комментарии', url: '/forum/lastcomments', title: '', icon: 'user'});
    //     this.menuList.push({anchor: 'Выплаты', url: '/payments/zakaz', title: '', icon: 'user'});
    //     this.menuList.push({anchor: 'Платежи', url: '/payments', title: '', icon: 'user'});
    //     this.menuList.push({anchor: 'Слайды', url: '/slider', title: '', icon: 'user'});
    //     this.menuList.push({anchor: 'Задачи', url: '/todo', title: '', icon: 'user'});
    //     this.menuList.push({anchor: 'Битые ссылки', url: '/link', title: '', icon: 'user'});
    //     this.menuList.push({anchor: 'Факты о сайте', url: '/fact', title: '', icon: 'user'});
    // }
  },
  data() {
    return {
      authStatus: true,
    }
  }
}
</script>

<style lang="scss">
.h1 {
  font-size: 1.7rem;
}

.nowrap {
  white-space: nowrap;
}

#app {
  $mainColor: #3B90D1;
  font-family: 'Open Sans', 'Apercu Mono Pro', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin-top: 0;

  &.pre {
    white-space: pre;
  }
}
</style>

<template lang="pug">n-config-provider(:theme="darkTheme" :theme-overrides="themeOverrides")
  n-loading-bar-provider
    n-dialog-provider
      n-notification-provider
        n-message-provider
          naive-api-registrar
          main
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
import NaiveApiRegistrar from "./components/NaiveApiRegistrar.vue";

import {
  darkTheme,
  NConfigProvider,
  NLoadingBarProvider,
  NDialogProvider,
  NNotificationProvider,
  NMessageProvider,
} from 'naive-ui';

import axios from 'axios';
import {getProfile} from './services/api.js';
import {mapGetters} from 'vuex';

export default {
  name: 'App',
  components: {
    NavBar,
    UserBar,
    SideBar,
    NaiveApiRegistrar,
    NConfigProvider,
    NLoadingBarProvider,
    NDialogProvider,
    NNotificationProvider,
    NMessageProvider,
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
    // console.log('mounted')
    // console.log(import.meta.env)
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
      darkTheme,
      authStatus: true,
      themeOverrides: {
        common: {
          primaryColor: '#ff7a00',
          primaryColorHover: '#ff9433',
          primaryColorPressed: '#e66e00',
          primaryColorSuppl: '#ff9433',
          // только чёрный/оранжевый/белый: info/success — оранжевые,
          // warning — светло-оранжевый, error — нейтральный (без красного)
          infoColor: '#ff7a00',
          infoColorHover: '#ff9433',
          infoColorPressed: '#e66e00',
          infoColorSuppl: '#ff9433',
          successColor: '#ff7a00',
          successColorHover: '#ff9433',
          successColorPressed: '#e66e00',
          successColorSuppl: '#ff9433',
          warningColor: '#ffab5e',
          warningColorHover: '#ffbd80',
          warningColorPressed: '#e6924a',
          warningColorSuppl: '#ffbd80',
          errorColor: '#ff7a00',
          errorColorHover: '#ff9433',
          errorColorPressed: '#e66e00',
          errorColorSuppl: '#ff9433',
        },
      },
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
  font-family: 'Open Sans', 'Apercu Mono Pro', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text);
  margin-top: 0;

  &.pre {
    white-space: pre;
  }
}
</style>

<template>

  <nav-bar/>

  <div v-if="isLoggedIn">
    <user-bar :user="user"/>
  </div>
  <router-link class="pr-2" v-for="item in menuList" :key="item.url" :to="item.url">
    <font-awesome-icon class="pr-1" :icon="item.icon"/>
    <span class="hidden-sm-down">{{ item.anchor }}</span>
  </router-link>

  <div class="container-fluid">
    <div v-if="loading" class="text-center">
      <b-spinner class="align-middle"/>
    </div>
    <b-row v-else>
      <b-col md="12" class="pt-3">
        <router-view></router-view>
      </b-col>
    </b-row>
    <b-row>
      <b-col>

      </b-col>
    </b-row>
  </div>
</template>

<script>
import UserBar from "./components/navbar/UserBar";
import NavBar from "./components/navbar/NavBar";
import axios from 'axios';

export default {
  name: 'App',
  components: {
    NavBar,
    UserBar
  },
  // provide: function () {
  //     return {
  //         logout: this.logout
  //     }
  // },
        // watch: {
        //     '$route': function () {
        //         this.pageNotFound = false;
        //     }
        // },
        created: function () {
          if (this.$store.state.auth.token) {
            axios.defaults.headers.common['Authorization'] = this.$store.getters.headerToken;
          }
          

            /*this.$http.interceptors.request.use(function (request) {
              if (that.$store.state.auth.token !== '') {
                request.headers.Authorization = that.;
              }
              return request;
            }, undefined);
            console.log("this.$http", this.$http.interceptors.request.headers);*/
        },
        // mounted() {
        //     this.$root.$on(
        //         'pageNotFound',
        //         (pageNotFound) => {
        //             this.pageNotFound = pageNotFound;
        //         }
        //     );
        // },
        computed: {
            isLoggedIn: function () {
              return this.$store.getters.isAuthenticated;
            },
            user: function () {
                return {
                  username: this.isLoggedIn ? this.$store.getters.username : null,
                  credit: 0,
                  balance: 0,
                  rating: 0
                };
            },
        },

        mounted() {
          const isLoggedIn = this.$store.getters.isAuthenticated;
          // if (this.$store.getters.username) {
          //     this.user.login = this.$store.getters.username;
          // }

          this.menuList = [
            {anchor: 'Ablaki', url: '/games/ablaki', title: 'Игра Ablaki', icon: 'apple-alt'},
            {anchor: 'Орел-решка', url: '/games/orel', title: 'Игра Орел-решка', icon: 'adjust'},
            {anchor: 'Дуэль', url: '/games/duel', title: 'Игра дуэль', icon: 'crosshairs'},
            {anchor: '5 яблок', url: '/games/fiveapple', title: 'Игра 5 яблок', icon: 'graduation-cap'},
          ];

          if (!this.isLoggedIn) {
            this.menuList.unshift({anchor: 'Войти', url: '/users/login', title: 'Авторизация', icon: 'sign-in-alt'});
          } else {
            this.menuList.push({anchor: 'Пополнить', url: 'balance/pay', title: 'Пополнить баланс', icon: 'plus'});
            this.menuList.push({
              anchor: 'Заказать выплату',
              url: 'balance/zakaz',
              title: 'Заказать выплату',
              icon: 'dollar-sign'
            });

            this.menuList.push({anchor: 'Кабинет', url: '/users/profile', title: 'Кабинет', icon: 'user'});
            this.menuList.push({anchor: 'Выход', url: '/users/logout', title: 'Выход', icon: 'sign-out-alt'});
          }

          if (this.loading) {
            this.menuList.push({anchor: 'Статистика', url: '/statistic', title: '', icon: 'user'});
            this.menuList.push({anchor: 'Биржа кредитов', url: '/exchange', title: '', icon: 'user'});
            this.menuList.push({anchor: 'Перевод кредитов', url: '/transfer', title: '', icon: 'user'});
            this.menuList.push({anchor: 'История баланса', url: '/balance', title: '', icon: 'user'});
            this.menuList.push({anchor: 'Комментарии', url: '/forum/lastcomments', title: '', icon: 'user'});
            this.menuList.push({anchor: 'Выплаты', url: '/payments/zakaz', title: '', icon: 'user'});
            this.menuList.push({anchor: 'Платежи', url: '/payments', title: '', icon: 'user'});
            this.menuList.push({anchor: 'Слайды', url: '/slider', title: '', icon: 'user'});
            this.menuList.push({anchor: 'Задачи', url: '/todo', title: '', icon: 'user'});
            this.menuList.push({anchor: 'Битые ссылки', url: '/link', title: '', icon: 'user'});
            this.menuList.push({anchor: 'Факты о сайте', url: '/fact', title: '', icon: 'user'});
          }
        },
        data() {
            return {
              pageNotFound: false,
              menuList: [],
              menuTop: [],
              loading: false,
              foo: 'qwerty',
              bar: true,
            }
        }
    }
</script>

<style lang="scss">
    .h1 {
        font-size: 1.7rem;
    }
    .cursor-pointer {
        cursor: pointer;
    }

    .nowrap {
        white-space: nowrap;
    }

    #app {
        $mainColor: #3B90D1;

        font-family: 'Apercu Mono Pro', Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        color: #2c3e50;
        margin-top: 0;

        & .pre {
            white-space: pre;
        }
    }
</style>

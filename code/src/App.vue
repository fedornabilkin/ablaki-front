<template>
    <div id="app">

        <nav-bar :user="user" :menu-list="menuList"/>

        <div v-if="isLoggedIn">
            <user-bar :user="user"/>
        </div>

        <b-container fluid>
            <div v-if="loading" class="text-center">
                <b-spinner class="align-middle"/>
            </div>
            <b-row v-else>
                <b-col md="12" class="pt-3">
                    <router-view></router-view>
                </b-col>
            </b-row>
        </b-container>
    </div>
</template>

<script>
import UserBar from "./components/navbar/UserBar";
import NavBar from "./components/navbar/NavBar";

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
            let that = this;
            this.$http.interceptors.request.use(function (request) {
                if (that.$store.state.auth.token != '') {
                    request.headers.Authorization = that.$store.getters.headerToken;
                }
                return request;
            }, undefined);
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
                return this.$store.getters.isLoggedIn;
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
            // if (this.$store.getters.username) {
            //     this.user.login = this.$store.getters.username;
            // }

            this.menuList = [
                {anchor:'Ablaki', url: '/games/ablaki', title: 'Игра Ablaki', icon: 'apple-alt'},
                {anchor:'Орел-решка', url: '/games/orel', title: 'Игра Орел-решка', icon: 'adjust'},
                {anchor:'Дуэль', url: '/games/duel', title: 'Игра дуэль', icon: 'crosshairs'},
                {anchor:'5 яблок', url: '/games/fiveapple', title: 'Игра 5 яблок', icon: 'graduation-cap'},

                {anchor:'Пополнить', url: 'balance/pay', title: 'Пополнить баланс', icon: 'plus'},
                {anchor:'Заказать выплату', url: 'balance/zakaz', title: 'Заказать выплату', icon: 'dollar-sign'},
            ];

            if (!this.isLoggedIn) {
                this.menuList.unshift({anchor:'Войти', url: '/users/login', title: 'Авторизация', icon: 'sign-in-alt'});
            } else {
                this.menuList.push({anchor:'Кабинет', url: '/users/profile', title: 'Кабинет', icon: 'user'});
                this.menuList.push({anchor:'Выход', url: '/users/logout', title: 'Выход', icon: 'sign-out-alt'});
            }
        },
        data() {
            return {
                pageNotFound: false,
                menuList: [],
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

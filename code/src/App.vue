<template>

    

    <div class="container">
        <nav-bar/>

        <div v-if="isAuthenticated">
            <user-bar/>
        </div>

        <side-bar />

        <Suspense>
            <template #default>
                <router-view></router-view>
            </template>
            <template #fallback>
                <div>Loading...</div>
            </template>
        </Suspense>
        
    </div>
</template>

<script>
import UserBar from "./components/navbar/UserBar";
import NavBar from "./components/navbar/NavBar";
import SideBar from "./components/navbar/SideBar";

import axios from 'axios';
import { mapGetters } from 'vuex';

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
    },
    watch: {
        'headerToken': function() {
            axios.defaults.headers.common['Authorization'] = this.headerToken;
        }
    },
    computed: {
        ...mapGetters([
            'isAuthenticated',
            'headerToken'
        ]),
    },

    mounted() {
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
        return {}
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

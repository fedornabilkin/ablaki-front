import {createRouter, createWebHistory} from 'vue-router';

import WithUser from './components/WithUser.vue';

import Main from './components/pages/Main.vue';
import Forum from './components/pages/forum/Forum.vue';
import Read from "./components/pages/forum/Read.vue";

import PageNotFound from './components/pages/PageNotFound.vue';
import Wiki from './components/pages/Wiki.vue';

import Registration from './components/pages/user/Registration.vue';
import Login from './components/pages/user/Login.vue';
import loginKey from "./components/pages/user/loginKey.vue";
import Logout from './components/pages/user/Logout.vue';
import Wall from './components/pages/user/Wall.vue';
import Profile from './components/pages/user/Profile.vue';
import Exchange, {MyOrdersPage, OrdersHistoryPage, OrdersPage} from "./components/pages/user/Exchange";

import Saper from './components/pages/games/saper/Saper.vue';
import Orel, {GamesHistoryPage, MyOrelGames, OrelGames} from "./components/pages/games/Orel";

import {store} from './store/store';

// 1. Определяем компоненты для маршрутов.
// Они могут быть импортированы из других файлов
// 2. Определяем несколько маршрутов
// Каждый маршрут должен указывать на компонент.
// "Компонентом" может быть как конструктор компонента, созданный
// через `Vue.extend()`, так и просто объект с опциями компонента.

const routes = [
    // {
    //   path: '/',
    //   component: () => import('./components/pages/Main.vue')
    // },

    { path: '/', component: Main },

    { path: '/users/registration', component: Registration },
    { path: '/users/login', component: Login },
    { path: '/users/login-key/:key', component: loginKey },
    { path: '/users/logout', component: Logout },
    { path: '/users/profile', component: Profile },

    { path: '/', component: WithUser, children: [
        { path: '/games/orel', component: Orel, children: [
            { path: '', component: OrelGames },
            { path: 'my', component: MyOrelGames },
            { path: 'history', component: GamesHistoryPage },
        ], meta: { requiresAuth: true } },

        { path: '/games/saper', component: Saper, children: [
            { path: '', component: Saper },
            { path: 'my', component: Saper },
            { path: 'history', component: GamesHistoryPage },
        ], meta: { requiresAuth: true } },

        { path: '/exchange', component: Exchange, children: [
            { path: '', component: OrdersPage },
            { path: 'my', component: MyOrdersPage },
            { path: 'history', component: OrdersHistoryPage },
        ], meta: { requiresAuth: true } },

        { path: '/wall/:login', component: Wall },
    ], meta: { requiresAuth: true } },

    { path: '/forum', component: Forum, children: [
        // { path: '', component: OrdersPage },
        // { path: 'my', component: MyOrdersPage },
        // { path: 'read/:theme_id', component: Read },
    ]},
    { path: '/forum/read/:theme_id', component: Read },

    { path: '/:pathMatch(.*)', component: PageNotFound },

    { path: '/wiki', component: Wiki },

];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach((to, from) => {
    // instead of having to check every route record with
    // to.matched.some(record => record.meta.requiresAuth)
    // if (to.meta.requiresAuth && store.getters['auth/isAuthorized'] === false) {
    //     // this route requires auth, check if logged in
    //     // if not, redirect to login page.
    //     return {
    //         path: '/',
    //         // save the location we were at to come back later
    //         //query: { redirect: to.fullPath },
    //     }
    // }
})

export { router };

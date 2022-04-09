import Vue from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
// 1. Определяем компоненты для маршрутов.
// Они могут быть импортированы из других файлов
import Main from './components/pages/Main';
import Forum from './components/pages/forum/Forum';
import PageNotFound from './components/pages/PageNotFound';
import Wiki from './components/pages/Wiki';

import Registration from './components/pages/user/Registration';
import Login from './components/pages/user/Login';
import Logout from './components/pages/user/Logout';
import Wall from './components/pages/user/Wall';
import Profile from './components/pages/user/Profile';
import Exchange, { MyOrders, Orders } from './components/pages/user/Exchange';

import Ablaki from './components/pages/games/Ablaki';
import Orel, { GamesHistoryPage, MyOrelGames, OrelGames } from "./components/pages/games/Orel";

import { store } from './store/store';

// 2. Определяем несколько маршрутов
// Каждый маршрут должен указывать на компонент.
// "Компонентом" может быть как конструктор компонента, созданный
// через `Vue.extend()`, так и просто объект с опциями компонента.

const routes = [
    { path: '/', component: Main },

    { path: '/users/registration', component: Registration },
    { path: '/users/login', component: Login },
    { path: '/users/logout', component: Logout },

    { path: '/games/orel', component: Orel, children: [
        { path: '', component: OrelGames },
        { path: 'my', component: MyOrelGames },
        { path: 'history', component: GamesHistoryPage },
    ], meta: { requiresAuth: true } },

    { path: '/exchange', component: Exchange, children: [
        { path: '', component: Orders },
        { path: 'my', component: MyOrders },
    ], meta: { requiresAuth: true } },

    { path: '/:pathMatch(.*)', component: PageNotFound },



    { path: '/games/ablaki', component: Ablaki, meta: { requiresAuth: true } },
    
    { path: '/forum', component: Forum },
    { path: '/wiki', component: Wiki },

    { path: '/users/wall/:login', component: Wall, meta: { requiresAuth: true } },
    
    { path: '/users/profile', component: Profile },    
];

const router = createRouter({
    history: createWebHistory(),
    routes: routes,
});

router.beforeEach((to, from) => {
    // instead of having to check every route record with
    // to.matched.some(record => record.meta.requiresAuth)
    if (to.meta.requiresAuth && store.getters['auth/isAuthorized'] === false) {
        // this route requires auth, check if logged in
        // if not, redirect to login page.
        return {
            path: '/',
            // save the location we were at to come back later
            //query: { redirect: to.fullPath },
        }
    }
})

export { router };
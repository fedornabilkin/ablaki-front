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

import Ablaki from './components/pages/games/Ablaki';
import Orel from "./components/pages/games/Orel";

import { store } from './store/store';


// 2. Определяем несколько маршрутов
// Каждый маршрут должен указывать на компонент.
// "Компонентом" может быть как конструктор компонента, созданный
// через `Vue.extend()`, так и просто объект с опциями компонента.

const routes = [
    { path: "/:pathMatch(.*)*'", name: 'Error', component: PageNotFound },
    { path: '/', component: Main },

    { path: '/forum', component: Forum },
    { path: '/wiki', component: Wiki },

    { path: '/users/wall/:login', component: Wall, meta: { requiresAuth: true } },
    { path: '/users/registration', component: Registration },
    { path: '/users/login', component: Login },
    { path: '/users/logout', component: Logout },
    { path: '/users/profile', component: Profile },

    { path: '/games/ablaki', component: Ablaki },
    { path: '/games/orel', component: Orel },
];

const router = createRouter({
    history: createWebHistory(),
    routes: routes,
});

router.beforeEach((to, from) => {
    // instead of having to check every route record with
    // to.matched.some(record => record.meta.requiresAuth)
    if (to.meta.requiresAuth && store.getters.isAuthenticated === false) {
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
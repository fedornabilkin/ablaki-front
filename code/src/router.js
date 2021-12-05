import Vue from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
// 1. Определяем компоненты для маршрутов.
// Они могут быть импортированы из других файлов
import Main from './components/pages/Main';
import Forum from './components/pages/forum/Forum';
import PageNotFound from './components/pages/PageNotFound';
import Wiki from './components/pages/Wiki';

import Registration from './components/pages/user/Registration';
import Registration2 from './components/pages/user/Registration2';
import Login from './components/pages/user/Login';
import Logout from './components/pages/user/Logout';
import Wall from './components/pages/user/Wall';
import Profile from './components/pages/user/Profile';

import Ablaki from './components/pages/games/Ablaki';
import Orel from "./components/pages/games/Orel";

// 2. Определяем несколько маршрутов
// Каждый маршрут должен указывать на компонент.
// "Компонентом" может быть как конструктор компонента, созданный
// через `Vue.extend()`, так и просто объект с опциями компонента.

const routes = [
    {
        path: "/:pathMatch(.*)*'",
        name: 'Error',
        component: PageNotFound,
        meta: {
            required: true
        }
    },
    {
        path: '/',
        component: Main,
        meta: {
            required: true
        }
    },

    {path: '/forum', component: Forum},
    {path: '/wiki', component: Wiki},

    {path: '/users/wall/:login', component: Wall},
    {path: '/users/registration', component: Registration},
    {path: '/users/registration2', component: Registration2},
    {path: '/users/login', component: Login},
    {path: '/users/logout', component: Logout},
    {path: '/users/profile', component: Profile},

    {path: '/games/ablaki', component: Ablaki},
    {path: '/games/orel', component: Orel},
];

const router = createRouter({
    history: createWebHistory(),
    routes: routes,
});

export { router };
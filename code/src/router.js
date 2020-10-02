import Vue from 'vue';
import VueRouter from 'vue-router';

Vue.use(VueRouter);

// 1. Определяем компоненты для маршрутов.
// Они могут быть импортированы из других файлов
import Main from './components/pages/Main';
import Forum from './components/pages/Forum';
import PageNotFound from './components/pages/PageNotFound';
import Wiki from './components/pages/Wiki';

import Registration from './components/pages/user/Registration';
import Login from './components/pages/user/Login';
import Logout from './components/pages/user/Logout';
import Wall from './components/pages/user/Wall';
import Profile from './components/pages/user/Profile';

import Ablaki from './components/pages/games/Ablaki';

// 2. Определяем несколько маршрутов
// Каждый маршрут должен указывать на компонент.
// "Компонентом" может быть как конструктор компонента, созданный
// через `Vue.extend()`, так и просто объект с опциями компонента.

const routes = [
    {
        path: "*",
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

    { path: '/forum', component: Forum },
    { path: '/wiki', component: Wiki },

    { path: '/users/wall/:login', component: Wall },
    { path: '/users/registration', component: Registration },
    { path: '/users/login', component: Login },
    { path: '/users/logout', component: Logout },
    { path: '/users/profile', component: Profile },

    { path: '/games/ablaki', component: Ablaki }
];

export default new VueRouter({
    mode: 'history',
    routes: routes
});

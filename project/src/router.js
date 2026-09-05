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
import Exchange, {MyOrdersPage, OrdersHistoryPage, OrdersPage, MaterialsShop} from "./components/pages/user/Exchange";

import Saper from './components/pages/games/saper/Saper.vue';
import Orel, {GamesHistoryPage, MyOrelGames, OrelGames} from "./components/pages/games/Orel";
import Five, {FiveGames, MyFiveGames, FiveHistoryPage} from "./components/pages/games/five";
import Duel, {DuelGames, MyDuelGames, DuelHistoryPage} from "./components/pages/games/duel";

import Chat from './components/pages/chat/Chat.vue';
import Craft from './components/pages/craft/Craft.vue';
import City from './components/pages/city/City.vue';

import {store} from './store/store';
import {createAuthGuard} from './services/authGuard';

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
    { path: '/users/profile', component: Profile, meta: { requiresAuth: true } },

    { path: '/', component: WithUser, children: [
        { path: '/games/orel', component: Orel, children: [
            { path: '', component: OrelGames },
            { path: 'my', component: MyOrelGames },
            { path: 'history', component: GamesHistoryPage },
        ], meta: { requiresAuth: true } },

        { path: '/games/duel', component: Duel, children: [
            { path: '', component: DuelGames },
            { path: 'my', component: MyDuelGames },
            { path: 'history', component: DuelHistoryPage },
        ], meta: { requiresAuth: true } },

        { path: '/games/five', component: Five, children: [
            { path: '', component: FiveGames },
            { path: 'my', component: MyFiveGames },
            { path: 'history', component: FiveHistoryPage },
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
            { path: 'shop', component: MaterialsShop },
        ], meta: { requiresAuth: true } },

        { path: '/wall/:login', component: Wall },
    ], meta: { requiresAuth: true } },

    { path: '/chat', component: Chat, meta: { requiresAuth: true } },
    { path: '/chat/:roomId', component: Chat, meta: { requiresAuth: true } },

    { path: '/craft', component: Craft, meta: { requiresAuth: true } },

    { path: '/city', component: City, meta: { requiresAuth: true } },

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

router.beforeEach(createAuthGuard(store));

export { router };

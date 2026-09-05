import type { RouteRecordRaw } from 'vue-router';
const gameLobby = () => import('./components/pages/games/GameLobby.vue');
const history = () => import('./components/pages/user/History.vue');
const unavailable = () => import('./components/pages/Unavailable.vue');
export const routes: RouteRecordRaw[] = [
  { path: '/', component: () => import('./components/pages/Main.vue') },
  { path: '/games', component: () => import('./components/pages/games/Games.vue') },
  ...['/games/orel', '/games/orel/my', '/games/orel/history', '/games/saper'].map(path => ({ path, component: gameLobby, meta: { requiresAuth: true } })),
  { path: '/users', component: () => import('./components/pages/user/Members.vue') },
  { path: '/users/registration', component: () => import('./components/pages/user/Registration.vue') },
  { path: '/users/login', component: () => import('./components/pages/user/Login.vue') },
  { path: '/users/login-key/:key', component: () => import('./components/pages/user/loginKey.vue') },
  { path: '/users/logout', component: () => import('./components/pages/user/Logout.vue') },
  { path: '/users/profile', component: () => import('./components/pages/user/Profile.vue'), meta: { requiresAuth: true } },
  { path: '/wall/:login', component: () => import('./components/pages/user/Wall.vue') },
  { path: '/forum', component: () => import('./components/pages/forum/Forum.vue') },
  { path: '/forum/my', component: () => import('./components/pages/forum/Forum.vue'), meta: { requiresAuth: true } },
  { path: '/forum/read/:theme_id', component: () => import('./components/pages/forum/Read.vue') },
  { path: '/balance', component: history, meta: { requiresAuth: true } },
  { path: '/rating', component: history, meta: { requiresAuth: true } },
  { path: '/transfer', component: () => import('./components/pages/user/Transfers.vue'), meta: { requiresAuth: true } },
  { path: '/exchange', component: () => import('./components/pages/user/Exchange/Exchange.vue'), meta: { requiresAuth: true }, children: [
    { path: '', component: () => import('./components/pages/user/Exchange/OrdersPage.vue') },
    { path: 'my', component: () => import('./components/pages/user/Exchange/MyOrdersPage.vue') },
    { path: 'history', component: () => import('./components/pages/user/Exchange/OrdersHistoryPage.vue') },
  ] },
  // Preserve old URLs without presenting unconnected mock economies as live features.
  ...['/games/duel/:rest(.*)*', '/games/five/:rest(.*)*', '/chat/:rest(.*)*', '/craft', '/city', '/exchange/shop', '/top', '/statistic'].map(path => ({ path, component: unavailable })),
  { path: '/games/saper/my', redirect: '/games/saper' },
  { path: '/games/saper/history', redirect: '/balance' },
  { path: '/balance/pay', redirect: '/balance' },
  { path: '/wiki', component: () => import('./components/pages/Wiki.vue') },
  { path: '/:pathMatch(.*)*', component: () => import('./components/pages/PageNotFound.vue') },
];

import {createApp} from 'vue';
import {createPinia} from 'pinia';

import './index.scss';
import {applyThemeTokens} from './theme/tokens';
import App from './App.vue';
import {router} from './router';
import {store} from './store/store';
import {configureApiSession} from './services/httpClient';

import {IconManager} from './fontawesome.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
const _ = new IconManager()

applyThemeTokens();
const app = createApp(App);

configureApiSession(() => store.getters['auth/token'], () => {
  void store.dispatch('auth/clearData');
  const route = router.currentRoute.value;
  if (route.matched.some(record => record.meta.requiresAuth)) {
    void router.replace({path: '/users/login', query: {redirect: route.fullPath}});
  }
});

app.component('font-awesome-icon', FontAwesomeIcon)

app
  .use(createPinia())
  .use(router)
  .use(store)

app.mount('#app');

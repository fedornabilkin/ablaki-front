import {createApp} from 'vue';
import {createPinia} from 'pinia';

import './index.scss';
import App from './App.vue';
import {router} from './router';
import {store} from './store/store';

import {IconManager} from './fontawesome.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
const _ = new IconManager()

const app = createApp(App);

app.component('font-awesome-icon', FontAwesomeIcon)

app
  .use(createPinia())
  .use(router)
  .use(store)

app.mount('#app');

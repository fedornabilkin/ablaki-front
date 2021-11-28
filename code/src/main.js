import "core-js/stable";
import "regenerator-runtime/runtime";
import Vue, { createApp } from 'vue';
import { BootstrapVue3 } from './plugins/bootstrap-vue';
import './plugins/axios'
import App from './App.vue'
import { store } from './store/store';

import './fontawesome'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { router } from "./router";

import config from './config/config';

Vue.config.productionTip = false;

const app = createApp(App);

app.component("font-awesome-icon", FontAwesomeIcon);

app.use(store);
app.use(router);
app.use(BootstrapVue3);

// app.config.globalProperties.$config = config;

app.mount('#app');

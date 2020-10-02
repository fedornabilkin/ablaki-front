import "core-js/stable";
import "regenerator-runtime/runtime";
import Vue from 'vue'
import './plugins/bootstrap-vue'
import './plugins/axios'
import App from './App.vue'
import store from './store/store'
import router from './router'
import './fontawesome'
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'

Vue.component('font-awesome-icon', FontAwesomeIcon);

Vue.config.productionTip = false;

new Vue({
    router,
    store,
    render: h => h(App)
}).$mount('#app');

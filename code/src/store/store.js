import Vue from 'vue';
import Vuex from 'vuex';
import config from '../config/config';
import auth from './auth';
import menu from './menu';

Vue.use(Vuex);
Vue.prototype.$config = config;
export default new Vuex.Store({
    modules: {
        auth,
        menu
    }
});
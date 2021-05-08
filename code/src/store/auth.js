import axios from "axios";
import config from "../config/config";

let urlMain = config.getParam('apiDomain');

export default {
    getters: {
        isLoggedIn: state => !!state.token,
        authStatus: state => state.status,
        headerToken: state => 'Bearer ' + state.token,
        username: state => state.username,
        user: state => state.user,
    },
    state: {
        status: '',
        token: localStorage.getItem('token') || '',
        username: localStorage.getItem('username') || '',
        user: localStorage.getItem('user') || {},
    },
    mutations: {
        auth_request(state) {
            state.status = 'loading'
        },
        auth_success(state, user) {
            state.status = 'success';
            state.token = user.token;
            state.username = user.username;
            state.user = user;
        },
        auth_error(state) {
            state.status = 'error';
        },
        logout(state) {
            state.status = '';
            state.token = '';
            state.username = '';
            state.user = {};
        },
    },
    actions: {
        login({commit}, user) {
            return new Promise((resolve, reject) => {
                commit('auth_request');

                axios({
                    url: (urlMain + 'login'),
                    data: user,
                    method: 'POST',
                    // headers: {'TZ': Intl.DateTimeFormat().resolvedOptions().timeZone}
                })
                    .then(resp => {
                        if (resp.data.token !== undefined && resp.data.user !== undefined) {
                            const token = resp.data.token;
                            localStorage.setItem('token', token);
                            localStorage.setItem('username', resp.data.user.username);
                            localStorage.setItem('user', resp.data.user);
                            axios.defaults.headers.common['Authorization'] = token;
                            commit('auth_success', resp.data.user);
                        }
                        resolve(resp);
                    })
                    .catch(err => {
                        user.loader(false);
                        commit('auth_error');
                        localStorage.removeItem('token');
                        reject(err)
                    })
            })
        },
        registration({commit}, user) {
            return new Promise((resolve, reject) => {
                commit('auth_request');

                axios({
                    url: (urlMain + 'registration'),
                    data: user,
                    method: 'POST',
                })
                    .then(resp => {
                        user.submit.loader(false);
                        resolve(resp);
                    })
                    .catch(err => {
                        console.log(err);
                        // user.loader(false);
                        // commit('auth_error');
                        // localStorage.removeItem('token');
                        reject(err)
                    })
            })
        },
        clearData({commit}) {
            commit('logout');
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('user');
            delete axios.defaults.headers.common['Authorization'];
        },
        logout({commit}) {
            return new Promise((resolve, reject) => {
                axios({
                    url: (urlMain + 'logout'),
                    method: 'POST'
                })
                    .then(resp => {
                        this.dispatch('clearData');
                        resolve(resp);
                    })
                    .catch(err => {
                        this.dispatch('clearData');
                        reject(err)
                    })
            })
        }
    }
}

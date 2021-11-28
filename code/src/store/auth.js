import axios from "axios";
import config from "../config/config";

const AUTH_REQUEST = 'auth_request';
const AUTH_SUCCESS = 'auth_success';
const AUTH_ERROR = 'auth_error';
const LOGOUT = 'logout';

let urlMain = config.getParam('apiDomain');

const auth = {
    state: () => ({
        status: '',
        token: localStorage.getItem('token') || '',
        username: localStorage.getItem('username') || '',
        user: localStorage.getItem('user') || {},
    }),
    getters: {
        isAuthenticated: state => !!state.token,
        authStatus: state => state.status,
        headerToken: state => 'Bearer ' + state.token,
        username: state => state.username,
        user: state => {
            return state.user;
        },
    },
    mutations: {
        [AUTH_REQUEST]: (state) => {
            state.status = 'loading'
        },
        [AUTH_SUCCESS]: (state, user) => {
            console.log(user);
            state.status = 'success';
            state.token = user.token;
            state.username = user.username;
            state.user = user;
        },
        [AUTH_ERROR]: (state) => {
            state.status = 'error';
        },
        [LOGOUT]: (state) => {
            state.status = '';
            state.token = '';
            state.username = '';
            state.user = {};
        },
    },
    actions: {
        login({commit}, user) {
            return new Promise((resolve, reject) => {
                commit(AUTH_REQUEST);

                axios({
                    url: (urlMain + 'login'), data: user, method: 'POST',
                    // headers: {'TZ': Intl.DateTimeFormat().resolvedOptions().timeZone}
                })
                    .then(resp => {
                        if (resp.data.token !== undefined && resp.data.user !== undefined) {
                            const token = resp.data.token;
                            // resp.data.user.token = token;
                            localStorage.setItem('token', token);
                            localStorage.setItem('username', resp.data.user.username);
                            localStorage.setItem('user', resp.data.user);
                            axios.defaults.headers.common['Authorization'] = token;
                            commit(AUTH_SUCCESS, resp.data.user);
                        }
                        resolve(resp);
                    })
                    .catch(err => {
                        commit(AUTH_ERROR);
                        localStorage.removeItem('token');
                        reject(err)
                    })
            })
        },
        registration({commit}, user) {
            return new Promise((resolve, reject) => {
                commit(AUTH_REQUEST);

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
                        commit(AUTH_ERROR);
                        // localStorage.removeItem('token');
                        reject(err)
                    })
            })
        },
        clearData({commit}) {
            commit(LOGOUT);
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('user');
            delete axios.defaults.headers.common['Authorization'];
        },
        logout({commit}) {
            return new Promise((resolve, reject) => {
                axios({url: (urlMain + 'logout'), method: 'POST'})
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
};

export { auth };
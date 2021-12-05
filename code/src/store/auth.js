import axios from "axios";
import config from "../config/config";
import { login as apiLogin } from "../services/api";

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
        user: JSON.parse(localStorage.getItem('user')) || {},
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
        [AUTH_SUCCESS]: (state, payload) => {
            state.status = 'success';
            state.token = payload.token;
            state.username = payload.user.username;
            state.user = payload.user;
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

                apiLogin(user.login, user.password).then(res => {
                    localStorage.setItem('token', res.token);
                    localStorage.setItem('username', res.user.username);
                    localStorage.setItem('user', JSON.stringify(res.user));
                    commit(AUTH_SUCCESS, res);
                    resolve(res);
                }).catch(e => {
                    commit(AUTH_ERROR);
                    localStorage.removeItem('token');
                    reject(e);
                });
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
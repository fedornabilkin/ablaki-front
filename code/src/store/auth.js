import axios from "axios";
import config from "../config/config";
import { login as apiLogin, registration as apiRegistration, logout as apiLogout } from "../services/api";

const AUTH_REQUEST = 'auth_request';
const AUTH_SUCCESS = 'auth_success';
const AUTH_ERROR = 'auth_error';
const LOGOUT = 'logout';

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
            console.log("payload", payload);
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
        login({commit}, {login, password}) {
            return new Promise((resolve, reject) => {
                commit(AUTH_REQUEST);

                apiLogin(login, password).then(res => {
                    localStorage.setItem('token', res.token);
                    localStorage.setItem('username', res.user.username);
                    localStorage.setItem('user', JSON.stringify(res.user));
                    commit(AUTH_SUCCESS, res);
                    resolve(res);
                }).catch(e => {
                    localStorage.removeItem('token');
                    commit(AUTH_ERROR);
                    reject(e);
                });
            })
        },
        registration({commit}, {username, email, password}) {
            return new Promise((resolve, reject) => {
                commit(AUTH_REQUEST);

                apiRegistration(username, email, password).then(res => {
                    commit(AUTH_SUCCESS, {
                        token: '',
                        username: '',
                        user: ''
                    });
                    resolve(res);
                }).catch(e => {
                    commit(AUTH_ERROR);
                    reject(e);
                });
            })
        },
        clearData({commit}) {
            commit(LOGOUT);
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('user');
        },
        logout({commit}) {
            return new Promise((resolve, reject) => {
                apiLogout().then(res => {
                    this.dispatch('clearData');
                    resolve(resp);
                }).catch(err => {
                    this.dispatch('clearData');
                    reject(err)
                })
            })
        }
    }
};

export { auth };
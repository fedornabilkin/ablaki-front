import axios from "axios";
import config from "../config/config";
import { login as apiLogin, registration as apiRegistration, logout as apiLogout, getProfile as apiGetProfile } from "../services/api";

const AUTH_REQUEST = 'auth_request';
const AUTH_SUCCESS = 'auth_success';
const FETCH_USER_SUCCESS = 'fetch_user_success';
const AUTH_ERROR = 'auth_error';
const LOGOUT = 'logout';

const auth = {
    state: () => ({
        status: null,
        token: localStorage.getItem('token') || '',
        user: null,
    }),
    getters: {
        isAuthenticated: state => state.user !== null,
        isAuthorized: state => state.token.length > 0,
        authStatus: state => state.status,
        token: state => state.token,
        headerToken: state => 'Bearer ' + state.token,
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
            state.user = {...payload.user, username: payload.user.username};
        },
        [FETCH_USER_SUCCESS]: (state, payload) => {
            state.status = 'success';
            state.user = {...payload, username: payload.username};
        },
        [AUTH_ERROR]: (state) => {
            state.status = 'error';
        },
        [LOGOUT]: (state) => {
            state.status = 'success';
            state.token = '';
            state.user = null;
        },
    },
    actions: {
        login({commit}, {login, password}) {
            return new Promise((resolve, reject) => {
                commit(AUTH_REQUEST);

                apiLogin(login, password).then(res => {
                    localStorage.setItem('token', res.token);
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
                    // commit(AUTH_SUCCESS, {
                    //     token: '',
                    //     user: ''
                    // });
                    resolve(res);
                }).catch(e => {
                    commit(AUTH_ERROR);
                    reject(e);
                });
            })
        },
        fetchData({commit, getters}) {
            if (getters.token.length > 0) {
                return new Promise((resolve, reject) => {

                    if (getters.authStatus === null) {
                        commit(AUTH_REQUEST);
                    }

                    apiGetProfile().then(res => {
                        commit(FETCH_USER_SUCCESS, res);
                        resolve(res);
                    }).catch(e => {
                        localStorage.removeItem('token');
                        commit(AUTH_ERROR);
                        reject(e);
                    });
                
                });
            } else {
                commit(AUTH_ERROR);
            }
        },
        clearData({commit}) {
            commit(LOGOUT);
            localStorage.removeItem('token');
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
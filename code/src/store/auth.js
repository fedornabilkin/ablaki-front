import {
    getProfile as apiGetProfile,
    login as apiLogin,
    loginKey as apiLoginKey,
    logout as apiLogout,
    registration as apiRegistration
} from "../services/api";

const AUTH_REQUEST = 'auth_request';
const AUTH_SUCCESS = 'auth_success';
const FETCH_USER_SUCCESS = 'fetch_user_success';
const AUTH_ERROR = 'auth_error';
const LOGOUT = 'logout';

const auth = {
    namespaced: true,
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
        user: state => state.user,
    },
    mutations: {
        [AUTH_REQUEST]: (state) => {
            if (state.status === null || state.status === "guest") {
                state.status = 'loading';
            }
        },
        [AUTH_SUCCESS]: (state, payload) => {
            state.status = 'user';
            if (payload !== undefined) {
                state.token = payload.token;
                state.user = {...payload.user};
            }
        },
        [FETCH_USER_SUCCESS]: (state, payload) => {
            state.status = 'user';
            state.user = {...payload};
        },
        [AUTH_ERROR]: (state) => {
            state.status = 'guest';
        },
        [LOGOUT]: (state) => {
            state.status = 'guest';
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
        loginKey({commit}, {key}) {
            return new Promise((resolve, reject) => {
                commit(AUTH_REQUEST);

                apiLoginKey(key).then(res => {
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
                    commit(AUTH_SUCCESS);
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

                    commit(AUTH_REQUEST);

                    apiGetProfile().then(res => {
                        commit(FETCH_USER_SUCCESS, res);
                        resolve(res);
                    }).catch(e => {
                        this.dispatch('auth/clearData');
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
        setData({commit,}, userData) {
            commit(FETCH_USER_SUCCESS, userData);
        },
        addCredit({commit, state}, credits) {
            commit(FETCH_USER_SUCCESS, {
                ...state.user,
                person: {
                    ...state.user.person,
                    credit: state.user.person.credit + credits
                }
            });
        },
        addBalance({commit, state}, balance) {
            commit(FETCH_USER_SUCCESS, {
                ...state.user,
                person: {
                    ...state.user.person,
                    balance: state.user.person.balance + balance
                }
            });
        },
        logout({commit}) {
            return new Promise((resolve, reject) => {
                apiLogout().then(res => {
                    this.dispatch('auth/clearData');
                    resolve(res);
                }).catch(err => {
                    this.dispatch('auth/clearData');
                    reject(err)
                })
            })
        }
    }
};

export { auth };

import {
    getProfile as apiGetProfile,
    login as apiLogin,
    loginKey as apiLoginKey,
    logout as apiLogout,
    registration as apiRegistration,
} from '../services/api';

const pendingProfiles = new WeakMap();
const persistToken = token => {
    try {
        if (token) localStorage.setItem('token', token);
        else localStorage.removeItem('token');
    } catch { /* Session remains usable when browser storage is unavailable. */ }
};
const readToken = () => {
    try { return localStorage.getItem('token') || ''; }
    catch { return ''; }
};

async function authenticate({commit, state}, request) {
    commit('logout');
    persistToken('');
    commit('auth_request');
    const revision = state.revision;
    try {
        const response = await request();
        if (revision !== state.revision) throw new Error('Вход отменён');
        if (!response?.user?.id || typeof response.token !== 'string' || !response.token) {
            throw new Error('Сервер вернул некорректные данные входа');
        }
        persistToken(response.token);
        commit('auth_success', response);
        return response;
    } catch (error) {
        if (revision === state.revision) {
            persistToken('');
            commit('auth_error');
        }
        throw error;
    }
}

export const auth = {
    namespaced: true,
    state: () => ({status: null, token: readToken(), user: null, revision: 0}),
    getters: {
        isAuthenticated: state => state.status === 'user' && state.user !== null && !!state.token,
        isAuthorized: state => !!state.token,
        authStatus: state => state.status,
        token: state => state.token,
        headerToken: state => state.token ? 'Bearer ' + state.token : '',
        user: state => state.user,
    },
    mutations: {
        auth_request(state) {
            if (state.status !== 'user') state.status = 'loading';
        },
        auth_success(state, payload) {
            state.status = 'user';
            state.token = payload.token;
            state.user = {...payload.user};
        },
        fetch_user_success(state, payload) {
            state.status = 'user';
            state.user = {...payload};
        },
        auth_error(state) {
            state.status = 'guest';
            state.token = '';
            state.user = null;
            state.revision++;
        },
        profile_error(state) {
            // A temporary refresh failure must not sign out an already verified session.
            state.status = state.user ? 'user' : 'error';
        },
        logout(state) {
            state.status = 'guest';
            state.token = '';
            state.user = null;
            state.revision++;
        },
    },
    actions: {
        login(context, {login, password}) {
            return authenticate(context, () => apiLogin(login, password));
        },
        loginKey(context, {key}) {
            return authenticate(context, () => apiLoginKey(key));
        },
        async registration({commit, state}, payload) {
            commit('auth_request');
            const revision = state.revision;
            try {
                return await apiRegistration(payload.username, payload.email, payload.password);
            } finally {
                // Registration does not issue an API session.
                if (revision === state.revision) {
                    persistToken('');
                    commit('auth_error');
                }
            }
        },
        fetchData({commit, state, dispatch}) {
            if (!state.token) {
                if (state.status === null) commit('auth_error');
                return Promise.resolve(null);
            }
            const revision = state.revision;
            const pending = pendingProfiles.get(state);
            if (pending?.revision === revision) return pending.promise;
            commit('auth_request');
            const request = {revision, promise: null};
            request.promise = apiGetProfile().then(profile => {
                if (revision !== state.revision) return null;
                if (!profile?.id) throw new Error('Сервер вернул некорректный профиль');
                commit('fetch_user_success', profile);
                return profile;
            }).catch(error => {
                if (revision === state.revision) {
                    if (error.response?.status === 401) dispatch('clearData');
                    else commit('profile_error');
                }
                throw error;
            }).finally(() => {
                if (pendingProfiles.get(state) === request) pendingProfiles.delete(state);
            });
            pendingProfiles.set(state, request);
            return request.promise;
        },
        clearData({commit}) {
            commit('logout');
            persistToken('');
        },
        setData({commit, state}, userData) {
            if (state.token) commit('fetch_user_success', userData);
        },
        addCredit({commit, state}, credits) {
            if (!state.user) return;
            commit('fetch_user_success', {...state.user, person: {
                ...state.user.person, credit: Number(state.user.person.credit) + credits,
            }});
        },
        addBalance({commit, state}, balance) {
            if (!state.user) return;
            commit('fetch_user_success', {...state.user, person: {
                ...state.user.person, balance: Number(state.user.person.balance) + balance,
            }});
        },
        async logout({state, dispatch}) {
            const revision = state.revision;
            try { return await apiLogout(); }
            finally {
                if (revision === state.revision) await dispatch('clearData');
            }
        },
    },
};

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createStore} from 'vuex';
import {auth} from '../src/store/auth';
import * as api from '../src/services/api';
import {createAuthGuard} from '../src/services/authGuard';

vi.mock('../src/services/api', () => ({
    getProfile: vi.fn(), login: vi.fn(), loginKey: vi.fn(), logout: vi.fn(), registration: vi.fn(),
}));

const deferred = () => {
    let resolve!: (value: unknown) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return {promise, resolve, reject};
};
const makeStore = () => createStore({modules: {auth}});

beforeEach(() => {
    vi.resetAllMocks();
    const data = new Map();
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => data.set(key, value),
        removeItem: (key: string) => data.delete(key),
    });
});

describe('session lifecycle', () => {
    it('restores a stored session once for concurrent consumers', async () => {
        localStorage.setItem('token', 'saved');
        const request = deferred();
        vi.mocked(api.getProfile).mockReturnValue(request.promise);
        const store = makeStore();
        const first = store.dispatch('auth/fetchData');
        const second = store.dispatch('auth/fetchData');
        request.resolve({id: 7});
        await Promise.all([first, second]);
        expect(api.getProfile).toHaveBeenCalledTimes(1);
        expect(store.getters['auth/isAuthenticated']).toBe(true);
    });
    it('ignores a profile arriving after logout', async () => {
        localStorage.setItem('token', 'saved');
        const request = deferred();
        vi.mocked(api.getProfile).mockReturnValue(request.promise);
        const store = makeStore();
        const pending = store.dispatch('auth/fetchData');
        await store.dispatch('auth/clearData');
        request.resolve({id: 7});
        await pending;
        expect(store.getters['auth/user']).toBeNull();
        expect(store.getters['auth/token']).toBe('');
    });
    it('clears memory and storage when login fails', async () => {
        const store = makeStore();
        store.commit('auth/auth_success', {token: 'old', user: {id: 1}});
        localStorage.setItem('token', 'old');
        vi.mocked(api.login).mockRejectedValue(new Error('invalid credentials'));
        await expect(store.dispatch('auth/login', {login: 'a', password: 'b'})).rejects.toThrow();
        expect(store.getters['auth/user']).toBeNull();
        expect(store.getters['auth/headerToken']).toBe('');
        expect(localStorage.getItem('token')).toBeNull();
    });
    it('does not let an older login replace a newer account', async () => {
        const old = deferred();
        vi.mocked(api.login).mockReturnValueOnce(old.promise)
            .mockResolvedValueOnce({token: 'new', user: {id: 2}});
        const store = makeStore();
        const first = store.dispatch('auth/login', {login: 'a', password: 'a'}).catch(error => error);
        await store.dispatch('auth/login', {login: 'b', password: 'b'});
        old.resolve({token: 'old', user: {id: 1}});
        await first;
        expect(store.getters['auth/token']).toBe('new');
        expect(store.getters['auth/user'].id).toBe(2);
    });
    it('keeps a token on network failure but never treats it as verified', async () => {
        localStorage.setItem('token', 'saved');
        vi.mocked(api.getProfile).mockRejectedValue(new Error('offline'));
        const store = makeStore();
        await expect(store.dispatch('auth/fetchData')).rejects.toThrow('offline');
        expect(store.getters['auth/token']).toBe('saved');
        expect(store.getters['auth/isAuthenticated']).toBe(false);
    });
    it('removes an expired token on 401', async () => {
        localStorage.setItem('token', 'expired');
        vi.mocked(api.getProfile).mockRejectedValue({response: {status: 401}});
        const store = makeStore();
        await expect(store.dispatch('auth/fetchData')).rejects.toBeDefined();
        expect(localStorage.getItem('token')).toBeNull();
        expect(store.getters['auth/token']).toBe('');
    });
    it('preserves a verified session when a later profile refresh is temporarily offline', async () => {
        const store = makeStore();
        store.commit('auth/auth_success', {token: 'valid', user: {id: 1}});
        vi.mocked(api.getProfile).mockRejectedValue(new Error('offline'));
        await expect(store.dispatch('auth/fetchData')).rejects.toThrow('offline');
        expect(store.getters['auth/isAuthenticated']).toBe(true);
        expect(store.getters['auth/user'].id).toBe(1);
    });
    it('does not authenticate a registration response without a token', async () => {
        vi.mocked(api.registration).mockResolvedValue({result: true, user: {id: 3}});
        const store = makeStore();
        await store.dispatch('auth/registration', {username: 'new', email: 'a@b.test', password: 'password'});
        expect(store.getters['auth/isAuthenticated']).toBe(false);
        expect(store.getters['auth/authStatus']).toBe('guest');
    });
    it('guards direct nested routes after restoration and keeps the return path', async () => {
        const store = makeStore();
        const guard = createAuthGuard(store);
        const result = await guard({matched: [{meta: {requiresAuth: true}}], fullPath: '/games/duel/my'} as never,
            {} as never, vi.fn());
        expect(result).toEqual({path: '/users/login', query: {redirect: '/games/duel/my'}});
    });
});

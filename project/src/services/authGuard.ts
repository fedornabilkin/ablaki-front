import type {NavigationGuard} from 'vue-router';

type SessionStore = {
    getters: Record<string, unknown>;
    dispatch: (type: string) => Promise<unknown>;
};

export function createAuthGuard(store: SessionStore): NavigationGuard {
    return async to => {
        if (store.getters['auth/authStatus'] === null || store.getters['auth/authStatus'] === 'loading') {
            try {
                await store.dispatch('auth/fetchData');
            } catch {
                // Restoration records the failed state; the guard keeps protected UI closed.
            }
        }
        if (to.matched.some(record => record.meta.requiresAuth) &&
            !store.getters['auth/isAuthenticated']) {
            return {path: '/users/login', query: {redirect: to.fullPath}};
        }
    };
}

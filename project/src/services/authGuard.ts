import type {NavigationGuard} from 'vue-router';

type SessionStore = {
    getters: Record<string, unknown>;
    dispatch: (type: string) => Promise<unknown>;
};

export function createAuthGuard(store: SessionStore): NavigationGuard {
    return async to => {
        const protectedRoute = to.matched.some(record => record.meta.requiresAuth);
        if (store.getters['auth/authStatus'] === null || store.getters['auth/authStatus'] === 'loading') {
            const restoration = store.dispatch('auth/fetchData').catch(() => undefined);
            // Public content does not depend on the account request. Protected routes still do.
            if (protectedRoute) await restoration;
        }
        if (protectedRoute &&
            !store.getters['auth/isAuthenticated']) {
            return {path: '/users/login', query: {redirect: to.fullPath}};
        }
    };
}

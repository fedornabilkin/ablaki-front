import { ref, getCurrentScope, onScopeDispose } from "vue";

/**
 * query helper
 * @param {Function} fun - Query function.
 * @param {any} defaultValue - Default result value.
 * @param {Function} handler - Additional fun applied to the result.
 * @returns {Boolean} useFetch.isLoading - is query in loading state.
 * @returns {any} useFetch.result - query result with handler fun.
 * @returns {Function} useFetch.refetch - repeat query.
*/
export const useFetch = (fun, defaultValue = null, handler = r=>r) => {
    const isLoading = ref(true);
    const result = ref(defaultValue);
    const error = ref(null);
    let requestId = 0;
    let disposed = false;

    const fetch = async () => {
        if (disposed) return;
        const currentRequest = ++requestId;
        isLoading.value = true;
        error.value = null;
        try {
            const response = await fun();
            if (!disposed && currentRequest === requestId) {
                result.value = handler(response);
            }
        } catch (cause) {
            if (!disposed && currentRequest === requestId) error.value = cause;
        } finally {
            if (!disposed && currentRequest === requestId) isLoading.value = false;
        }
    }

    if (getCurrentScope()) onScopeDispose(() => { disposed = true; });

    fetch();

    return {
        isLoading,
        result,
        error,
        refetch: fetch,
    }
}

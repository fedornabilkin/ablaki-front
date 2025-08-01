import { ref } from "vue";

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

    const fetch = () => {
        isLoading.value = true;

        fun().then(res => {
            result.value = handler(res);
            isLoading.value = false;
        });
    }

    fetch();

    return {
        isLoading,
        result,
        refetch: fetch,
    }
}
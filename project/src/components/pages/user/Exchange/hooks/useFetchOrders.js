import { ref } from "vue";
import { useFetch } from "../../../../../hooks/useFetch";

export const useFetchOrders = (fun) => {
    const {
        isLoading,
        result: ordersList,
        refetch,
        error,
    } = useFetch(
        fun, 
        [], 
        (res) => {
        return res.map((order) => {
            return {
                ...order,
                isLoading: false,
                status: null,
            };
        });
    });

    return {
        isLoading,
        ordersList,
        refetch,
        error,
    }
}

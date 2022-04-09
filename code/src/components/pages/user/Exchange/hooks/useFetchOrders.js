import { ref } from "vue";

export const useFetchOrders = (fun) => {
    const isloading = ref(true);
    const ordersList = ref([]);

    const fetch = () => {
        isloading.value = true;

        fun().then(res => {
            ordersList.value = res.map((order) => {
                return {
                    ...order,
                    isLoading: false,
                    status: null,
                };
            });

            isloading.value = false;
        });
    }

    fetch();

    return {
        isloading,
        ordersList,
    }
}
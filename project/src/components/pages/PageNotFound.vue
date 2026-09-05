<script>
    import { useRouter } from "vue-router";
    import { NResult, NButton, NImage } from "naive-ui";

    export default {
        name: "PageNotFound",
        components: { NResult, NButton, NImage },

        setup() {
            const router = useRouter();

            const goBack = () => {
                router.go(-1);
            };

            return {
                goBack,
            };
        },
    };
</script>

<template>
    <n-result status="404" title="Not Found" description="Страница не найдена">
        <template #icon>
            <n-image :src="'@/assets/logo.jpeg'"></n-image>
        </template>
        <template #footer>
            <n-button type="primary" @click="goBack">Назад</n-button>
        </template>
    </n-result>
</template>

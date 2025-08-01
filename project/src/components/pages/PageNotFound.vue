<script>
    import { useRouter } from "vue-router";

    export default {
        name: "PageNotFound",

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
    <el-result title="Not Found" sub-title="Страница не найдена">
        <template #icon>
            <el-image :src="require('@/assets/logo.jpeg')"></el-image>
        </template>
        <template #extra>
            <el-button type="primary" @click="goBack">Назад</el-button>
        </template>
    </el-result>
</template>

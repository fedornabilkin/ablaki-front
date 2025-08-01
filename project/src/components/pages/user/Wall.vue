<script>
import { ref } from "vue";
import { useRoute } from 'vue-router';
import { getWall } from '../../../services/api';
import PageHeader from '../../PageHeader.vue';

export default {
    components: { PageHeader },
    setup() {
        const route = useRoute();
        
        const wall = ref(null);
        const isLoading = ref(true);

        getWall(route.params.login).then(res => {
            wall.value = res;
            isLoading.value = false;
        });

        return {
            wall,
            isLoading,
        };
    },
};
</script>

<template>
    <div v-loading="isLoading">
        <template v-if="wall">
            <page-header
                :pageTitle="wall.username"
                :extraLinks="[{
                    link: `/wall/${wall.username}`,
                    title: 'Стена',
                }, {
                    link: `/messages/${wall.username}`,
                    title: 'Сообщение',
                }, {
                    link: `#`,
                    title: 'Подписаться',
                }]"
            />

            <div class="container py-4">
                <div class="row">
                    <div class="col-md-4">
                        <el-card shadow="never">
                            <el-avatar class="user-avatar" shape="square" fit="cover" src="https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg" />
                        </el-card>
                    </div>
                    <div class="col-md-8">
                        <el-card shadow="never">
                            <div class="row">
                                <div class="col">Рейтинг</div>
                                <div class="col-auto">{{wall.person.rating}}</div>
                            </div>
                            <div class="row mt-3">
                                <div class="col">Рефералов</div>
                                <div class="col-auto">{{wall.person.refovod}}</div>
                            </div>
                        </el-card>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<style lang="scss" scoped>
    .user-avatar {
        width: 100%;min-height: 150px;
    }
</style>
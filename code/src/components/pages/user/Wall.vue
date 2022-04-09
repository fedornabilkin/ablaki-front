<template>
    <div class="container py-4" v-loading="isLoading">
        <template v-if="wall">
            <h2>{{wall.username}}</h2>
            <div class="row">
                <div class="col-md-4">
                    <el-card shadow="never">
                        <el-avatar style="width: 100%;" shape="square" fit="cover" size="100%" src="https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg" />
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
        </template>
    </div>
</template>

<script>
import { ref } from "vue";
import { useRoute } from 'vue-router';
import { getWall } from '../../../services/api';

export default {
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

<style lang="scss" scoped>

</style>
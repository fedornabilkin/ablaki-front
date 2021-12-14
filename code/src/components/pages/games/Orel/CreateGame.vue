<script>
import { ref } from "@vue/reactivity";
import { ElNotification } from 'element-plus';

import { orel } from "../../../../services/api";

export default {
    props: {
        isOpen: {
            type: Boolean,
            default: true,
        },
    },
    emits: ['close'],
    setup(props, { emit }) {
        const kon = ref(5);
        const count = ref(1);

        const createGame = () => {
            orel.create(kon.value, count.value)
                .then((res) => {
                    ElNotification({
                        message: 'Игры созданы',
                        type: 'success',
                    });
                })
                .catch((err) => {
                    console.log(err);
                });
        };

        const closeDialog = () => {
            emit('close');
        };

        const btnActive = kon.value && kon.value > 0 && count.value && count.value > 0;

        return {
            kon,
            count,
            createGame,
            closeDialog,
            props,
            btnActive,
        };
    },
};
</script>

<template>
    <el-dialog
        :model-value="props.isOpen"
        title="Создать игры"
        destroy-on-close
        @close="closeDialog"
    >
        <form action="" class="form-newgame">
            <div class="row">
                <div class="col-sm label">Ставка</div>

                <div class="col-sm-auto">
                    <el-input-number v-model="kon" :min="1" controls-position="right" />
                </div>
            </div>

            <div class="fast-kon mt-2">
                <div>
                    <el-button type="info" size="small" @click="kon = 10">10</el-button>
                </div>
                <div>
                    <el-button type="info" size="small" @click="kon = 20">20</el-button>
                </div>
                <div>
                    <el-button type="info" size="small" @click="kon = 50">50</el-button>
                </div>
                <div>
                    <el-button type="info" size="small" @click="kon = 100">100</el-button>
                </div>
                <div>
                    <el-button type="info" size="small" @click="kon = 200">200</el-button>
                </div>
                <div>
                    <el-button type="info" size="small" @click="kon = 500">500</el-button>
                </div>
                <div>
                    <el-button type="info" size="small" @click="kon = 1000">1000</el-button>
                </div>
            </div>

            <div class="row mt-4">
                <div class="col-sm">Кол-во игр</div>
                <div class="col-sm-auto">
                    <el-input-number v-model="count" :min="1" controls-position="right" />
                </div>
            </div>

            <div class="fast-kon mt-2">
                <div>
                    <el-button type="info" size="small" @click="count = 3">3</el-button>
                </div>
                <div>
                    <el-button type="info" size="small" @click="count = 5">5</el-button>
                </div>
                <div>
                    <el-button type="info" size="small" @click="count = 10">10</el-button>
                </div>
                <div>
                    <el-button type="info" size="small" @click="count = 20">20</el-button>
                </div>
                <div>
                    <el-button type="info" size="small" @click="count = 30">30</el-button>
                </div>
                <div>
                    <el-button type="info" size="small" @click="count = 50">50</el-button>
                </div>
                <div>
                    <el-button type="info" size="small" @click="count = 100">100</el-button>
                </div>
            </div>

            <div class="mt-3">
                <el-button type="primary" @click="createGame" :disabled="!btnActive"
                    >Создать</el-button
                >
            </div>
        </form>
    </el-dialog>
</template>

<style lang="scss" scoped>
    .form-newgame {
        .label {
            display: flex;
            align-items: center;
        }

        .fast-kon {
            display: flex;
            justify-content: flex-start;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
    }
</style>

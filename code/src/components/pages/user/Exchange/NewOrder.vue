<script>
import { computed, ref } from "@vue/reactivity";
import { ElNotification } from 'element-plus';

import { errorHandler, exchange } from "../../../../services/api";

export default {
    props: {
        isOpen: {
            type: Boolean,
            default: true,
        },
    },
    emits: ['close', 'created'],
    setup(props, { emit }) {
        const type = ref(0);
        const credit = ref(50);
        const rate = ref(1);
        const count = ref(1);
        const isLoading = ref(false);

        const createOrder = () => {
            isLoading.value = true;
            exchange.create(type.value, credit.value, rate.value, count.value)
                .then((res) => {
                    ElNotification({
                        message: 'Заявки созданы',
                        type: 'success',
                    });
                    isLoading.value = false;

                    emit("created");
                })
                .catch((err) => {
                    errorHandler(err, {
                        "Insufficient funds": () => {
                            ElNotification({
                                message: 'Недостаточно средств на балансе',
                                type: 'error',
                            });
                            
                            isLoading.value = false;
                        }
                    });
                });
        };

        const closeDialog = () => {
            emit('close');
        };

        const btnActive = computed(() => credit.value > 0 && rate.value > 0 && count.value > 0);
        
        const price = computed(() => Math.round(rate.value / 1000 * credit.value * 10000) / 10000);

        return {
            props,
            type,
            credit,
            rate,
            count,
            isLoading,
            createOrder,
            closeDialog,
            btnActive,
            price,
        };
    },
};
</script>

<template>
    <el-dialog
        :model-value="props.isOpen"
        title="Добавить заявку"
        destroy-on-close
        @close="closeDialog"
    >

        <el-form
            label-position="top"
            @submit.prevent="createOrder"
            class="form-neworder"
        >

            <el-radio-group v-model="type">
                <el-radio-button :label="0">Продать</el-radio-button>
                <el-radio-button :label="1">Купить</el-radio-button>
            </el-radio-group>         

            <div class="row mt-3">
                <div class="col-6">
                    <el-form-item label="Кредитов" label-position="top">
                        <el-input-number v-model="credit" controls-position="right" />
                    </el-form-item>
                </div>

                <div class="col-6">
                    <el-form-item label="По курсу за 1000" label-position="top">
                        <el-input-number v-model="rate" :min="0" :step="0.01" controls-position="right" />
                    </el-form-item>
                </div>
            </div>

            <div class="row">
                <div class="col-6">
                    <el-form-item label="Заявок" label-position="top">
                        <el-input-number v-model="count" :min="1" controls-position="right" />
                    </el-form-item>
                </div>

                <div class="col-6">
                    <el-form-item label="Стоимость заявки" label-position="top">
                        <el-input v-model="price" disabled/>
                    </el-form-item>
                </div>
            </div>

            <div class="mt-3">
                <el-button type="primary"
                    :disabled="!btnActive"
                    :loading="isLoading"
                    native-type="submit"
                >Добавить</el-button>
            </div>
        </el-form>
    </el-dialog>
</template>

<style lang="scss" scoped>
    .form-neworder {
        .label {
            display: flex;
            align-items: center;
        }
        .el-input-number {
            max-width: unset;
        }
    }

    .tabs {
        display: flex;
        
        .tab {
            padding: .2rem .5rem;
        }
    }
</style>

<script>
    import { computed, reactive, ref } from "@vue/reactivity";

    export default {
        props: {
            konCount: {
                type: Array,
                default: () => null,
            },
        },
        emits: ["konFilter"],
        setup(props, { emit }) {
            const konFilter = ref();

            const tooltipButtonRef = reactive({el: null, content: null});

            const isKonfilterVisible = computed(
                () =>
                    props.konCount !== null &&
                    props.konCount.length > 1 /* && props.gamesList.length >= 20*/
            );

            const onClickKonFilter = (kon) => {
                konFilter.value = konFilter.value === kon ? undefined : kon;
                emit("konFilter", konFilter.value);
            };

            const onFilterBtnMouseover = (e, count) => {
                tooltipButtonRef.el = e.currentTarget;
                tooltipButtonRef.content = count;
            };

            return {
                props,
                konFilter,
                tooltipButtonRef,
                isKonfilterVisible,
                onClickKonFilter,
                onFilterBtnMouseover,
            };
        }
    }
</script>

<template>
    <div v-if="isKonfilterVisible" class="kon-filter">
        <el-button-group class="kon-list">
            <el-button
                v-for="{ kon, count } in props.konCount"
                :class="{ selected: kon === konFilter }"
                @click="onClickKonFilter(kon)"
                @mouseover="(e) => onFilterBtnMouseover(e, count)"
                >{{ kon }}</el-button
            >
        </el-button-group>

        <el-tooltip
            effect="dark"
            placement="top"
            :virtual-ref="tooltipButtonRef.el"
            virtual-triggering
        >
            <template #content>
                <span>{{tooltipButtonRef.content}} шт.</span>
            </template>
        </el-tooltip>
    </div>
</template>

<style lang="scss" scoped>
.kon-filter {
        .kon-list {
            overflow: auto;
            display: flex;
            margin-bottom: 0.5rem;

            .selected {
                background: var(--el-color-primary);
                color: var(--el-color-white);
            }
        }
    }
</style>
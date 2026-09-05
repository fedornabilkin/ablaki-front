<script>
    import { computed, ref } from "@vue/reactivity";
    import { NButtonGroup, NButton, NTooltip } from "naive-ui";

    export default {
        components: { NButtonGroup, NButton, NTooltip },
        props: {
            konCount: {
                type: Array,
                default: () => null,
            },
        },
        emits: ["konFilter"],
        setup(props, { emit }) {
            const konFilter = ref();

            const isKonfilterVisible = computed(
                () =>
                    props.konCount !== null &&
                    props.konCount.length > 1
            );

            const onClickKonFilter = (kon) => {
                konFilter.value = konFilter.value === kon ? undefined : kon;
                emit("konFilter", konFilter.value);
            };

            return {
                props,
                konFilter,
                isKonfilterVisible,
                onClickKonFilter,
            };
        }
    }
</script>

<template>
    <div v-if="isKonfilterVisible" class="kon-filter">
        <n-button-group class="kon-list">
            <n-tooltip
                v-for="{ kon, count } in props.konCount"
                :key="kon"
                trigger="hover"
                placement="top"
            >
                <template #trigger>
                    <n-button
                        :class="{ selected: kon === konFilter }"
                        @click="onClickKonFilter(kon)"
                    >{{ kon }}</n-button>
                </template>
                <span>{{ count }} шт.</span>
            </n-tooltip>
        </n-button-group>
    </div>
</template>

<style lang="scss" scoped>
.kon-filter {
        .kon-list {
            overflow: auto;
            display: flex;
            margin-bottom: 0.5rem;

            .selected {
                background: var(--primary);
                color: var(--text-on-acc);
            }
        }
    }
</style>

<script setup>
import {ref} from 'vue';
import {NPopover} from 'naive-ui';
import {ALLOWED_REACTIONS} from '@/services/chat/protocol';

const emit = defineEmits(['pick']);
const show = ref(false);

const onPick = (emoji) => {
    emit('pick', emoji);
    show.value = false;
};
</script>

<template>
    <n-popover trigger="click" v-model:show="show" placement="top">
        <template #trigger>
            <button class="reaction-trigger" title="Реакция">😀</button>
        </template>
        <div class="reaction-picker">
            <button
                v-for="emoji in ALLOWED_REACTIONS"
                :key="emoji"
                class="reaction-btn"
                @click="onPick(emoji)"
            >{{ emoji }}</button>
        </div>
    </n-popover>
</template>

<style lang="scss" scoped>
.reaction-trigger {
    background: transparent;
    color: var(--text);
    border: none;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 0.3rem;
    cursor: pointer;
    font-size: 1rem;

    &:hover {
        background: var(--bg-surface-2);
    }
}

.reaction-picker {
    display: flex;
    gap: 0.2rem;
}

.reaction-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
    padding: 0.15rem 0.3rem;
    border-radius: 0.3rem;

    &:hover {
        background: var(--bg-surface-2);
    }
}
</style>

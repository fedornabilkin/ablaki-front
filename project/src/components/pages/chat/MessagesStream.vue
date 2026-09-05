<script setup>
import {ref, computed, watch, nextTick, onMounted, onBeforeUnmount} from 'vue';
import {useChatStore} from '@/store/chat';
import MessageItem from './MessageItem.vue';

const chat = useChatStore();

const scrollRef = ref(null);
const stickToBottom = ref(true);

const messages = computed(() => chat.currentMessages);

const isNearBottom = () => {
    const el = scrollRef.value;
    if (!el) return true;
    const threshold = 80;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
};

const scrollToBottom = () => {
    const el = scrollRef.value;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
};

const onScroll = async () => {
    const el = scrollRef.value;
    if (!el) return;
    stickToBottom.value = isNearBottom();
    if (el.scrollTop < 40 && messages.value.length > 0) {
        const beforeId = messages.value[0].id;
        if (beforeId > 0 && chat.currentRoomId) {
            const prevHeight = el.scrollHeight;
            await chat.loadHistory(chat.currentRoomId, beforeId);
            await nextTick();
            const newHeight = el.scrollHeight;
            el.scrollTop = newHeight - prevHeight;
        }
    }
};

watch(messages, async () => {
    await nextTick();
    if (stickToBottom.value) scrollToBottom();
}, {deep: true, flush: 'post'});

watch(() => chat.currentRoomId, async () => {
    stickToBottom.value = true;
    await nextTick();
    scrollToBottom();
});

onMounted(async () => {
    await nextTick();
    scrollToBottom();
});

const trackBy = (m) => m._client_id ?? m.id;
</script>

<template>
    <div ref="scrollRef" class="messages-stream" @scroll.passive="onScroll">
        <transition-group name="fade-list" tag="div" class="messages-inner">
            <message-item
                v-for="m in messages"
                :key="trackBy(m)"
                :message="m"
            />
        </transition-group>
    </div>
</template>

<style lang="scss" scoped>
.messages-stream {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem 1rem;
    background: var(--bg-base);
}

.messages-inner {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>

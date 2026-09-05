<script setup>
import {onMounted, onBeforeUnmount, watch, ref, computed} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {useMessage, useNotification, NDrawer, NDrawerContent, NButton} from 'naive-ui';
import {useChatStore} from '@/store/chat';

import RoomsList from './RoomsList.vue';
import ChatRoom from './ChatRoom.vue';

const route = useRoute();
const router = useRouter();
const chat = useChatStore();
const message = useMessage();
const notification = useNotification();

const showRoomsDrawer = ref(false);

const syncFromRoute = () => {
    const id = Number(route.params.roomId);
    if (id && id !== chat.currentRoomId) {
        chat.joinRoom(id);
    }
};

chat.setNotifiers({
    info: (p) => message.info(`${p.title ? p.title + ': ' : ''}${p.content || ''}`),
    warning: (p) => notification.warning({title: p.title, content: p.content, duration: 5000}),
    error: (p) => notification.error({title: p.title, content: p.content, duration: 6000}),
});

onMounted(async () => {
    await chat.connect();
    syncFromRoute();
});

onBeforeUnmount(() => {
    chat.disconnect();
});

watch(() => route.params.roomId, syncFromRoute);

const onPickRoom = (id) => {
    showRoomsDrawer.value = false;
    router.push(`/chat/${id}`);
};

const statusLabel = computed(() => {
    if (chat.isDisabled) return 'WS не настроен';
    if (chat.isConnected) return 'Онлайн';
    return 'Подключение…';
});
</script>

<template lang="pug">
  .chat-page
    aside.chat-sidebar
      rooms-list(:active-id="chat.currentRoomId" @pick="onPickRoom")
    section.chat-main
      .chat-mobile-top
        n-button(text @click="showRoomsDrawer = true")
          template(#icon)
            font-awesome-icon(icon="fa fa-comments")
          | Комнаты
        .chat-status
          .chat-status-dot(:class="{'is-online': chat.isConnected, 'is-disabled': chat.isDisabled}")
          span {{ statusLabel }}
      chat-room
    n-drawer(v-model:show="showRoomsDrawer" :width="280" placement="left")
      n-drawer-content(title="Комнаты" closable)
        rooms-list(:active-id="chat.currentRoomId" @pick="onPickRoom")
</template>

<style lang="scss" scoped>
.chat-page {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    height: calc(100vh - 7rem);
    background: var(--bg-base);
}

.chat-sidebar {
    display: none;
    border-right: 0.0625rem solid var(--border);
    background: var(--bg-surface);
    overflow: hidden;
}

.chat-main {
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.chat-mobile-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    border-bottom: 0.0625rem solid var(--border);
    background: var(--bg-surface);
}

.chat-status {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: var(--text-muted);
}

.chat-status-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--text-muted);

    &.is-online {
        background: #2ecc71;
    }
    &.is-disabled {
        background: #c0392b;
    }
}

@media (min-width: 48rem) {
    .chat-page {
        grid-template-columns: 17rem 1fr;
    }
    .chat-sidebar {
        display: block;
    }
    .chat-mobile-top {
        display: none;
    }
}
</style>

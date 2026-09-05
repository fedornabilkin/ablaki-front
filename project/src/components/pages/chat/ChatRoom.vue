<script setup>
import {ref, computed} from 'vue';
import {NButton, NDrawer, NDrawerContent} from 'naive-ui';
import {useChatStore} from '@/store/chat';

import MessagesStream from './MessagesStream.vue';
import TypingIndicator from './TypingIndicator.vue';
import MessageInput from './MessageInput.vue';
import UsersList from './UsersList.vue';

const chat = useChatStore();

const showUsersDrawer = ref(false);

const room = computed(() => chat.currentRoom);
const meta = computed(() => chat.currentMeta);

const usersCount = computed(() => chat.currentUsers.length);
</script>

<template lang="pug">
  .chat-room(v-if="room")
    header.chat-room-header
      .chat-room-title
        font-awesome-icon(:icon="meta.is_channel ? 'fa fa-volume-up' : (meta.is_private ? 'fa fa-lock' : 'fa fa-comment')")
        span {{ room.getName() }}
      n-button(text @click="showUsersDrawer = true")
        template(#icon)
          font-awesome-icon(icon="fa fa-user")
        | {{ usersCount }}
    messages-stream
    typing-indicator
    message-input
    n-drawer(v-model:show="showUsersDrawer" :width="280" placement="right")
      n-drawer-content(title="Участники" closable)
        users-list
  .chat-room.is-empty(v-else)
    .chat-room-placeholder
      font-awesome-icon(icon="fa fa-comments" style="font-size: 2.5rem; opacity: 0.5;")
      p Выберите комнату слева или создайте новую.
</template>

<style lang="scss" scoped>
.chat-room {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    background: var(--bg-base);
}

.chat-room.is-empty {
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
}

.chat-room-placeholder {
    text-align: center;
    color: var(--text-muted);

    p {
        margin-top: 0.75rem;
    }
}

.chat-room-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 1rem;
    border-bottom: 0.0625rem solid var(--border);
    background: var(--bg-surface);
}

.chat-room-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text);
    font-weight: 700;
}
</style>

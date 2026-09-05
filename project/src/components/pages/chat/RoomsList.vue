<script setup>
import {ref, computed} from 'vue';
import {NButton, NBadge, NSpin, NEmpty} from 'naive-ui';
import {useChatStore} from '@/store/chat';
import RoomCreateModal from './RoomCreateModal.vue';

defineProps({
    activeId: {type: [Number, null], default: null},
});
const emit = defineEmits(['pick']);

const chat = useChatStore();
const showCreate = ref(false);

const rooms = computed(() => chat.rooms);
const loading = computed(() => chat.roomsLoading);

const unreadOf = (id) => chat.unreadByRoom[id] || 0;

const onPick = (id) => emit('pick', id);

const onCreated = async (room) => {
    showCreate.value = false;
    if (room?.id) emit('pick', room.id);
};
</script>

<template lang="pug">
  .rooms-list
    .rooms-header
      .rooms-title Комнаты
      n-button(size="small" type="primary" @click="showCreate = true")
        template(#icon)
          font-awesome-icon(icon="fa fa-plus")
        | Новая
    n-spin(:show="loading")
      .rooms-empty(v-if="!loading && rooms.length === 0")
        n-empty(description="Пока нет комнат")
      ul.rooms-items(v-else)
        li.room-item(
          v-for="r in rooms"
          :key="r.getId()"
          :class="{'is-active': r.getId() === activeId}"
          @click="onPick(r.getId())"
        )
          .room-icon
            font-awesome-icon(:icon="r.isChannel() ? 'fa fa-volume-up' : (r.isPrivate() ? 'fa fa-lock' : 'fa fa-comment')")
          .room-meta
            .room-name {{ r.getName() }}
            .room-sub(v-if="r.members_count") {{ r.members_count }} участн.
          n-badge(:value="unreadOf(r.getId())" :max="99" :show="unreadOf(r.getId()) > 0")
    room-create-modal(v-model:show="showCreate" @created="onCreated")
</template>

<style lang="scss" scoped>
.rooms-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.rooms-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 0.75rem 0.5rem;
}

.rooms-title {
    font-weight: 700;
    color: var(--text);
}

.rooms-items {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    flex: 1;
}

.rooms-empty {
    padding: 1rem;
    color: var(--text-muted);
}

.room-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 0.75rem;
    cursor: pointer;
    border-left: 3px solid transparent;
    transition: background-color 0.15s ease, border-color 0.15s ease;

    &:hover {
        background: var(--bg-surface-2);
    }

    &.is-active {
        background: var(--primary-soft);
        border-left-color: var(--primary);
    }

    .room-icon {
        color: var(--text-muted);
        width: 1.25rem;
        text-align: center;
    }

    .room-meta {
        flex: 1;
        min-width: 0;
    }

    .room-name {
        color: var(--text);
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .room-sub {
        color: var(--text-muted);
        font-size: 0.75rem;
    }
}
</style>

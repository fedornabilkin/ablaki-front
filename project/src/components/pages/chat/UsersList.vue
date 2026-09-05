<script setup>
import {computed} from 'vue';
import {NAvatar, NPopover, NButton, NEmpty} from 'naive-ui';
import {useChatStore} from '@/store/chat';

const chat = useChatStore();

const users = computed(() => chat.currentUsers);
const meta = computed(() => chat.currentMeta);

const roleOf = (user) => {
    if (Number(meta.value?.owner_id) === Number(user.id)) return 'owner';
    if ((meta.value?.admin_ids || []).includes(Number(user.id))) return 'admin';
    return 'member';
};
</script>

<template>
    <div class="users-list">
        <n-empty v-if="users.length === 0" description="Никого нет" size="small" />
        <ul v-else>
            <li v-for="u in users" :key="u.id" class="user-row">
                <n-popover trigger="click" placement="left">
                    <template #trigger>
                        <button class="user-btn">
                            <n-avatar round size="small">
                                {{ (u.username || '?').slice(0, 1).toUpperCase() }}
                            </n-avatar>
                            <span class="user-name">{{ u.username }}</span>
                            <font-awesome-icon
                                v-if="roleOf(u) === 'owner'"
                                icon="fa fa-crown"
                                class="user-role-icon owner"
                            />
                            <font-awesome-icon
                                v-else-if="roleOf(u) === 'admin'"
                                icon="fa fa-star"
                                class="user-role-icon admin"
                            />
                        </button>
                    </template>
                    <div class="user-popover">
                        <div class="user-popover-name">{{ u.username }}</div>
                        <div v-if="u.rating" class="user-popover-rating">Рейтинг: {{ u.rating }}</div>
                        <router-link :to="`/wall/${u.username}`">
                            <n-button size="small" type="primary" block>На стену</n-button>
                        </router-link>
                    </div>
                </n-popover>
            </li>
        </ul>
    </div>
</template>

<style lang="scss" scoped>
.users-list {
    height: 100%;
    overflow-y: auto;

    ul {
        list-style: none;
        margin: 0;
        padding: 0.25rem 0;
    }
}

.user-row {
    padding: 0.15rem 0.25rem;
}

.user-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.35rem 0.5rem;
    background: transparent;
    color: var(--text);
    border: none;
    border-radius: 0.35rem;
    cursor: pointer;

    &:hover {
        background: var(--bg-surface-2);
    }
}

.user-name {
    flex: 1;
    text-align: left;
}

.user-role-icon {
    &.owner { color: gold; }
    &.admin { color: var(--primary); }
}

.user-popover {
    min-width: 12rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;

    .user-popover-name {
        font-weight: 700;
        color: var(--text);
    }
    .user-popover-rating {
        color: var(--text-muted);
        font-size: 0.85rem;
    }
}
</style>

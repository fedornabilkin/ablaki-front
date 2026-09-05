<script setup>
import {computed, ref} from 'vue';
import {useStore} from 'vuex';
import {NAvatar, NDropdown} from 'naive-ui';
import {useChatStore} from '@/store/chat';
import ReactionPicker from './ReactionPicker.vue';
import MessageContextMenu from './MessageContextMenu.vue';
import moment from 'moment';

const props = defineProps({
    message: {type: Object, required: true},
});

const vuex = useStore();
const chat = useChatStore();

const currentUser = computed(() => vuex.getters['auth/user']);
const meta = computed(() => chat.currentMeta);

const author = computed(() => props.message.getAuthor?.() || {});
const isOwn = computed(() => {
    const u = currentUser.value;
    if (!u) return false;
    return Number(author.value?.id) === Number(u.id) || author.value?.username === u.username;
});

const canModerate = computed(() => {
    const u = currentUser.value;
    if (!u) return false;
    if (meta.value?.owner_id && Number(meta.value.owner_id) === Number(u.id)) return true;
    const admins = meta.value?.admin_ids || [];
    return admins.includes(Number(u.id));
});

const time = computed(() => {
    const ts = props.message.created_at;
    if (!ts) return '';
    return moment.unix(ts).format('HH:mm');
});

const reactions = computed(() => {
    const r = props.message.getReactions?.() || {};
    return Object.entries(r)
        .map(([emoji, users]) => ({emoji, count: Array.isArray(users) ? users.length : Number(users)}))
        .filter(({count}) => count > 0);
});

const onReact = (emoji) => chat.react(props.message.id, emoji);
const onEdit = (text) => chat.editMessage(props.message.id, text);
const onDelete = () => chat.deleteMessage(props.message.id);

const showActions = ref(false);
</script>

<template>
    <div
        class="message-row"
        :class="{'is-own': isOwn, 'is-deleted': message.isDeleted(), 'is-pending': message.pending, 'is-failed': message.failed}"
        @mouseenter="showActions = true"
        @mouseleave="showActions = false"
    >
        <div class="message-avatar" v-if="!isOwn">
            <n-avatar round size="small">
                {{ (author.username || '?').slice(0, 1).toUpperCase() }}
            </n-avatar>
        </div>

        <div class="message-body">
            <div class="message-meta" v-if="!isOwn">
                <span class="message-author">{{ author.username || 'Аноним' }}</span>
            </div>

            <div class="message-bubble">
                <div class="message-text" v-if="!message.isDeleted()">{{ message.getText() }}</div>
                <div class="message-text is-deleted" v-else>сообщение удалено</div>

                <div class="message-footer">
                    <span class="message-time">{{ time }}</span>
                    <span class="message-edited" v-if="message.isEdited() && !message.isDeleted()">(изменено)</span>
                    <span class="message-pending" v-if="message.pending">⏳</span>
                    <span class="message-failed" v-if="message.failed">⚠</span>
                </div>
            </div>

            <div class="message-reactions" v-if="reactions.length">
                <button
                    v-for="r in reactions"
                    :key="r.emoji"
                    class="reaction-pill"
                    @click="onReact(r.emoji)"
                >
                    <span>{{ r.emoji }}</span>
                    <span class="reaction-count">{{ r.count }}</span>
                </button>
            </div>
        </div>

        <div class="message-actions" v-if="showActions && !message.isDeleted()">
            <reaction-picker @pick="onReact" />
            <message-context-menu
                :can-edit="isOwn"
                :can-delete="isOwn || canModerate"
                :initial-text="message.getText()"
                @edit="onEdit"
                @delete="onDelete"
            />
        </div>
    </div>
</template>

<style lang="scss" scoped>
.message-row {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    position: relative;
    padding: 0.15rem 0;

    &.is-own {
        flex-direction: row-reverse;

        .message-body {
            align-items: flex-end;
        }

        .message-bubble {
            background: var(--primary);
            color: var(--text-on-acc);
        }

        .message-time, .message-edited {
            color: rgba(0, 0, 0, 0.55);
        }
    }

    &.is-pending .message-bubble {
        opacity: 0.7;
    }

    &.is-failed .message-bubble {
        outline: 1px solid #c0392b;
    }
}

.message-avatar {
    flex-shrink: 0;
}

.message-body {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    max-width: min(70%, 32rem);
    min-width: 0;
}

.message-meta {
    font-size: 0.78rem;
    color: var(--text-muted);
    margin-bottom: 0.15rem;
    padding: 0 0.25rem;
}

.message-bubble {
    background: var(--bg-surface);
    color: var(--text);
    border: 0.0625rem solid var(--border);
    border-radius: 0.75rem;
    padding: 0.45rem 0.7rem;
    line-height: 1.4;
    word-wrap: break-word;
    overflow-wrap: anywhere;
}

.message-text.is-deleted {
    font-style: italic;
    opacity: 0.6;
}

.message-footer {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-top: 0.2rem;
}

.message-edited {
    font-style: italic;
}

.message-reactions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 0.25rem;
}

.reaction-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    background: var(--bg-surface);
    border: 0.0625rem solid var(--border);
    border-radius: 999px;
    padding: 0.1rem 0.4rem;
    color: var(--text);
    font-size: 0.75rem;
    cursor: pointer;

    &:hover {
        border-color: var(--primary);
    }
}

.message-actions {
    position: absolute;
    top: -1.5rem;
    right: 0.5rem;
    display: flex;
    gap: 0.25rem;
    background: var(--bg-surface);
    border: 0.0625rem solid var(--border);
    border-radius: 0.5rem;
    padding: 0.2rem;
    box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.4);
    z-index: 1;
}
</style>

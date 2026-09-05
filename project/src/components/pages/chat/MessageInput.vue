<script setup>
import {ref, computed} from 'vue';
import {useStore} from 'vuex';
import {NInput, NButton, NAlert} from 'naive-ui';
import {useChatStore} from '@/store/chat';

const chat = useChatStore();
const vuex = useStore();

const text = ref('');
const sending = ref(false);

const currentUser = computed(() => vuex.getters['auth/user']);
const meta = computed(() => chat.currentMeta);

const isReadonly = computed(() => {
    if (!meta.value?.is_channel) return false;
    const u = currentUser.value;
    if (!u) return true;
    if (Number(meta.value.owner_id) === Number(u.id)) return false;
    const admins = meta.value.admin_ids || [];
    return !admins.includes(Number(u.id));
});

const canSend = computed(() => !!chat.currentRoomId && text.value.trim().length > 0 && !sending.value);

const onInput = (v) => {
    text.value = v;
    if (v) chat.notifyTyping();
};

const onKeydown = async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        await submit();
    }
};

const submit = async () => {
    if (!canSend.value) return;
    sending.value = true;
    const payload = text.value;
    text.value = '';
    try {
        chat.notifyTypingStop();
        await chat.sendMessage(payload);
    } finally {
        sending.value = false;
    }
};
</script>

<template>
    <div class="message-input">
        <n-alert
            v-if="isReadonly"
            type="info"
            :show-icon="true"
            :closable="false"
        >
            Этот канал только для чтения. Писать могут только владелец и админы.
        </n-alert>

        <div v-else class="message-input-row">
            <n-input
                :value="text"
                type="textarea"
                :autosize="{minRows: 1, maxRows: 5}"
                placeholder="Напишите сообщение… (Enter — отправить, Shift+Enter — перенос строки)"
                :disabled="!chat.currentRoomId"
                @update:value="onInput"
                @keydown="onKeydown"
            />
            <n-button
                type="primary"
                :loading="sending"
                :disabled="!canSend"
                @click="submit"
            >
                <template #icon>
                    <font-awesome-icon icon="fa fa-paper-plane"/>
                </template>
            </n-button>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.message-input {
    padding: 0.5rem 0.75rem 0.75rem;
    border-top: 0.0625rem solid var(--border);
    background: var(--bg-surface);
}

.message-input-row {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
}
</style>

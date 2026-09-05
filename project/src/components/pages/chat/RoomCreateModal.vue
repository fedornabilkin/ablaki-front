<script setup>
import {ref, watch} from 'vue';
import {
    NModal, NForm, NFormItem, NInput, NCheckbox, NButton, useNotification,
} from 'naive-ui';
import {useChatStore} from '@/store/chat';

const props = defineProps({
    show: {type: Boolean, default: false},
});
const emit = defineEmits(['update:show', 'created']);

const chat = useChatStore();
const notification = useNotification();

const form = ref({name: '', is_private: false, password: '', is_channel: false});
const submitting = ref(false);

const reset = () => {
    form.value = {name: '', is_private: false, password: '', is_channel: false};
    submitting.value = false;
};

watch(() => props.show, (v) => { if (v) reset(); });

const close = () => emit('update:show', false);

const submit = async () => {
    if (!form.value.name.trim()) return;
    submitting.value = true;
    try {
        const created = await chat.createRoom({
            name: form.value.name.trim(),
            is_private: form.value.is_private,
            password: form.value.is_private ? form.value.password : null,
            is_channel: form.value.is_channel,
        });
        emit('created', created);
    } catch (e) {
        notification.error({
            title: 'Не удалось создать комнату',
            content: e?.message || 'Попробуйте ещё раз',
        });
    } finally {
        submitting.value = false;
    }
};
</script>

<template>
    <n-modal
        :show="show"
        preset="card"
        title="Новая комната"
        style="max-width: 480px;"
        @update:show="(v) => $emit('update:show', v)"
    >
        <n-form :model="form" label-placement="top" @submit.prevent="submit">
            <n-form-item label="Название">
                <n-input v-model:value="form.name" placeholder="Например: общий чат" maxlength="80" />
            </n-form-item>

            <n-form-item>
                <n-checkbox v-model:checked="form.is_channel">Канал (писать могут только админы)</n-checkbox>
            </n-form-item>

            <n-form-item>
                <n-checkbox v-model:checked="form.is_private">Приватная (только по паролю)</n-checkbox>
            </n-form-item>

            <n-form-item v-if="form.is_private" label="Пароль">
                <n-input v-model:value="form.password" type="password" placeholder="Пароль для входа" />
            </n-form-item>

            <div class="actions">
                <n-button @click="close" :disabled="submitting">Отмена</n-button>
                <n-button
                    type="primary"
                    attr-type="submit"
                    :loading="submitting"
                    :disabled="!form.name.trim()"
                    @click="submit"
                >Создать</n-button>
            </div>
        </n-form>
    </n-modal>
</template>

<style lang="scss" scoped>
.actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.5rem;
}
</style>

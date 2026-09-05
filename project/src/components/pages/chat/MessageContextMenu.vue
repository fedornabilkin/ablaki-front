<script setup>
import {ref, computed, h} from 'vue';
import {NDropdown, NModal, NInput, NButton, NPopconfirm} from 'naive-ui';

const props = defineProps({
    canEdit: {type: Boolean, default: false},
    canDelete: {type: Boolean, default: false},
    initialText: {type: String, default: ''},
});
const emit = defineEmits(['edit', 'delete']);

const showEdit = ref(false);
const editText = ref('');

const options = computed(() => {
    const opts = [];
    if (props.canEdit) opts.push({label: 'Изменить', key: 'edit'});
    if (props.canDelete) opts.push({label: 'Удалить', key: 'delete'});
    return opts;
});

const onSelect = (key) => {
    if (key === 'edit') {
        editText.value = props.initialText;
        showEdit.value = true;
    } else if (key === 'delete') {
        if (window.confirm('Удалить сообщение?')) emit('delete');
    }
};

const submitEdit = () => {
    const t = editText.value.trim();
    if (t) emit('edit', t);
    showEdit.value = false;
};
</script>

<template>
    <span v-if="options.length > 0">
        <n-dropdown :options="options" trigger="click" placement="bottom-end" @select="onSelect">
            <button class="ctx-trigger" title="Действия">
                <font-awesome-icon icon="fa fa-ellipsis-v"/>
            </button>
        </n-dropdown>
        <n-modal v-model:show="showEdit" preset="card" title="Изменить сообщение" style="max-width: 480px;">
            <n-input
                v-model:value="editText"
                type="textarea"
                :autosize="{minRows: 2, maxRows: 6}"
                placeholder="Текст сообщения"
            />
            <template #footer>
                <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
                    <n-button @click="showEdit = false">Отмена</n-button>
                    <n-button type="primary" :disabled="!editText.trim()" @click="submitEdit">Сохранить</n-button>
                </div>
            </template>
        </n-modal>
    </span>
</template>

<style lang="scss" scoped>
.ctx-trigger {
    background: transparent;
    color: var(--text);
    border: none;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 0.3rem;
    cursor: pointer;

    &:hover {
        background: var(--bg-surface-2);
    }
}
</style>

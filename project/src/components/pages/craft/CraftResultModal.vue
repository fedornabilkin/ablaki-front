<script setup>
import {ref, computed, watch} from 'vue';
import {NModal, NButton, NAlert} from 'naive-ui';
import {useCraftStore} from '@/store/craft';
import ItemCard from './ItemCard.vue';

const craft = useCraftStore();

const show = ref(false);
const isError = computed(() => !!craft.lastError);

const close = () => {
    show.value = false;
    craft.clearResult();
};

watch(
    () => !!(craft.lastResult || craft.lastError),
    (has) => { if (has) show.value = true; },
);

watch(show, (v) => { if (!v) craft.clearResult(); });
</script>

<template>
    <n-modal
        v-model:show="show"
        preset="card"
        :title="isError ? 'Не вышло' : 'Готово!'"
        :closable="true"
        :mask-closable="true"
        :close-on-esc="true"
        style="max-width: 360px;"
        @close="close"
    >
        <div class="result">
            <n-alert v-if="isError" type="error" :show-icon="true" :closable="false">
                {{ craft.lastError }}
            </n-alert>
            <template v-else-if="craft.lastResult">
                <div class="result-icon">
                    <item-card
                        v-if="craft.lastResult.item"
                        :item="craft.lastResult.item"
                        :qty="craft.lastResult.qty"
                        size="lg"
                        :interactive="false"
                    />
                </div>
                <div class="result-text">
                    Получено: {{ craft.lastResult.qty }}× {{ craft.lastResult.item.name }}
                </div>
            </template>
        </div>
        <template #footer>
            <div class="actions">
                <n-button type="primary" @click="close">Закрыть</n-button>
            </div>
        </template>
    </n-modal>
</template>

<style lang="scss" scoped>
.result {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
}

.result-icon {
    width: 7rem;
}

.result-text {
    color: var(--text);
    font-weight: 600;
    text-align: center;
}

.actions {
    display: flex;
    justify-content: flex-end;
}
</style>

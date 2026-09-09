<script setup>
import {onMounted, ref} from 'vue';
import {NTabs, NTabPane, NAlert, NButton} from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import Workshop from './Workshop.vue';
import {useCraftStore} from '@/store/craft';

import InventoryGrid from './InventoryGrid.vue';
import RecipeList from './RecipeList.vue';
import CraftResultModal from './CraftResultModal.vue';

const craft = useCraftStore();

const mobileTab = ref('recipes');
const localWorkshop = ref(false);

onMounted(() => {
    if (!craft.loaded) craft.load();
});
</script>

<template>
    <page-header page-title="Крафт">
        <template #actions>
            <n-button @click="localWorkshop = !localWorkshop">{{ localWorkshop ? 'К инвентарю аккаунта' : 'Попробовать крафт' }}</n-button>
        </template>
    </page-header>
    <workshop v-if="localWorkshop" />
    <n-alert v-else-if="craft.loadError" type="error" class="container">
        {{ craft.loadError }}
        <n-button @click="craft.load()" :loading="craft.loading">Повторить</n-button>
    </n-alert>
    <div v-else class="craft-page">
        <div class="craft-mobile">
            <n-tabs v-model:value="mobileTab" type="segment">
                <n-tab-pane name="recipes" tab="Рецепты">
                    <recipe-list />
                </n-tab-pane>
                <n-tab-pane name="inventory" tab="Инвентарь">
                    <inventory-grid />
                </n-tab-pane>
            </n-tabs>
        </div>

        <div class="craft-desktop">
            <aside class="craft-inventory">
                <inventory-grid />
            </aside>
            <section class="craft-recipes">
                <recipe-list />
            </section>
        </div>

        <craft-result-modal />
    </div>
</template>

<style lang="scss" scoped>
.craft-page {
    height: calc(100vh - 7rem);
    background: var(--bg-base);
}

.craft-mobile {
    display: block;
    height: 100%;

    :deep(.n-tabs) {
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    :deep(.n-tab-pane) {
        flex: 1;
        overflow-y: auto;
    }
}

.craft-desktop {
    display: none;
}

@media (min-width: 48rem) {
    .craft-mobile { display: none; }
    .craft-desktop {
        display: grid;
        grid-template-columns: 20rem 1fr;
        height: 100%;
    }
    .craft-inventory {
        border-right: 0.0625rem solid var(--border);
        background: var(--bg-surface);
        min-height: 0;
    }
    .craft-recipes {
        min-height: 0;
    }
}
</style>

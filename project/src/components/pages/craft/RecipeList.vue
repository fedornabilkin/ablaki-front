<script setup>
import {ref, computed} from 'vue';
import {NInput, NTabs, NTabPane, NEmpty} from 'naive-ui';
import {useCraftStore} from '@/store/craft';
import RecipeCard from './RecipeCard.vue';

const craft = useCraftStore();

const search = ref('');
const activeTab = ref('all');

const categories = computed(() => {
    const set = new Set();
    for (const r of craft.recipes) if (r.category) set.add(r.category);
    return ['all', ...set];
});

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    return craft.recipes.filter(r => {
        if (activeTab.value !== 'all' && r.category !== activeTab.value) return false;
        if (q && !r.name.toLowerCase().includes(q)) return false;
        return true;
    });
});

const tabLabel = (key) => key === 'all' ? 'Все' : key;
</script>

<template>
    <div class="recipe-list">
        <header class="recipe-list-header">
            <div class="recipe-list-title">
                <font-awesome-icon icon="fa fa-scroll"/>
                <span>Рецепты</span>
            </div>
            <n-input
                v-model:value="search"
                placeholder="Поиск рецепта…"
                clearable
                size="small"
                class="recipe-list-search"
            />
        </header>

        <n-tabs v-model:value="activeTab" type="segment" size="small">
            <n-tab-pane
                v-for="cat in categories"
                :key="cat"
                :name="cat"
                :tab="tabLabel(cat)"
            />
        </n-tabs>

        <n-empty v-if="filtered.length === 0" description="Ничего не нашлось" />
        <div v-else class="recipe-list-grid">
            <recipe-card v-for="r in filtered" :key="r.getId()" :recipe="r" />
        </div>
    </div>
</template>

<style lang="scss" scoped>
.recipe-list {
    padding: 0.75rem;
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.recipe-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.recipe-list-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text);
    font-weight: 700;
}

.recipe-list-search {
    max-width: 14rem;
}

.recipe-list-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.6rem;

    @media (min-width: 48rem) {
        grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
    }
}
</style>

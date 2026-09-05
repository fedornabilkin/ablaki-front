<script setup>
import {computed} from 'vue';
import {NEmpty, NSpin} from 'naive-ui';
import {useCraftStore} from '@/store/craft';
import ItemCard from './ItemCard.vue';

const craft = useCraftStore();

const materials = computed(() => craft.materials);
const products = computed(() => craft.products);
</script>

<template>
    <div class="inventory-grid">
        <n-spin :show="craft.loading">
            <section v-if="craft.loaded">
                <header class="inventory-header">
                    <font-awesome-icon icon="fa fa-toolbox"/>
                    <span>Материалы</span>
                </header>
                <n-empty v-if="materials.length === 0" description="Материалов нет" size="small" />
                <div v-else class="grid">
                    <item-card
                        v-for="entry in materials"
                        :key="entry.item.id"
                        :item="entry.item"
                        :qty="entry.qty"
                    />
                </div>

                <header class="inventory-header">
                    <font-awesome-icon icon="fa fa-gem"/>
                    <span>Готовые предметы</span>
                </header>
                <n-empty v-if="products.length === 0" description="Пока ничего не сделано" size="small" />
                <div v-else class="grid">
                    <item-card
                        v-for="entry in products"
                        :key="entry.item.id"
                        :item="entry.item"
                        :qty="entry.qty"
                    />
                </div>
            </section>
        </n-spin>
    </div>
</template>

<style lang="scss" scoped>
.inventory-grid {
    padding: 0.75rem;
    height: 100%;
    overflow-y: auto;
}

.inventory-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.5rem 0 0.65rem;
    color: var(--text);
    font-weight: 700;
    font-size: 0.95rem;

    &:first-child { margin-top: 0; }
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
    gap: 0.5rem;
    margin-bottom: 1.25rem;
}
</style>

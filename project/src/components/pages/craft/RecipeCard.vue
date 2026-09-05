<script setup>
import {computed} from 'vue';
import {NButton, NTag} from 'naive-ui';
import {useCraftStore} from '@/store/craft';
import ItemCard from './ItemCard.vue';

const props = defineProps({
    recipe: {type: Object, required: true},
});

const craft = useCraftStore();

const canCraft = computed(() => props.recipe.canCraft(craft.inventoryMap, 99999));
const isCrafting = computed(() => craft.crafting === props.recipe.id);

const onCraft = () => {
    if (!canCraft.value.ok || isCrafting.value) return;
    craft.craft(props.recipe.id);
};

const haveOf = (itemId) => craft.inventoryMap.get(itemId) || 0;
</script>

<template>
    <article class="recipe-card">
        <header class="recipe-card-header">
            <div class="recipe-name">{{ recipe.getName() }}</div>
            <div class="recipe-category" v-if="recipe.category">
                <n-tag size="small" :bordered="false">{{ recipe.category }}</n-tag>
            </div>
        </header>

        <p class="recipe-desc" v-if="recipe.description">{{ recipe.description }}</p>

        <div class="recipe-body">
            <div class="recipe-ingredients">
                <div class="recipe-ingredients-title">Нужно</div>
                <ul>
                    <li v-for="ing in recipe.ingredients" :key="ing.item.id">
                        <span class="ing-icon">
                            <font-awesome-icon :icon="ing.item.icon || 'fa fa-cube'"/>
                        </span>
                        <span class="ing-name">{{ ing.item.name }}</span>
                        <span class="ing-qty" :class="{ 'is-not-enough': haveOf(ing.item.id) < ing.qty }">
                            {{ haveOf(ing.item.id) }} / {{ ing.qty }}
                        </span>
                    </li>
                </ul>
            </div>

            <div class="recipe-arrow">
                <font-awesome-icon icon="fa fa-arrow-right"/>
            </div>

            <div class="recipe-output">
                <item-card
                    v-if="recipe.output"
                    :item="recipe.output"
                    :qty="recipe.output_qty"
                    size="lg"
                    :interactive="false"
                />
            </div>
        </div>

        <footer class="recipe-footer">
            <div class="recipe-cost" v-if="recipe.cost_credits > 0">
                <font-awesome-icon icon="fa fa-coins"/>
                {{ recipe.cost_credits }} Cr
            </div>
            <div v-else class="recipe-cost-empty"></div>
            <n-button
                type="primary"
                :loading="isCrafting"
                :disabled="!canCraft.ok || isCrafting"
                @click="onCraft"
            >
                <template #icon>
                    <font-awesome-icon icon="fa fa-hammer"/>
                </template>
                {{ canCraft.ok ? 'Скрафтить' : 'Не хватает' }}
            </n-button>
        </footer>
    </article>
</template>

<style lang="scss" scoped>
.recipe-card {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.85rem;
    background: var(--bg-surface);
    border: 0.0625rem solid var(--border);
    border-radius: 0.6rem;
    transition: border-color 0.15s ease;

    &:hover {
        border-color: var(--primary);
    }
}

.recipe-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.recipe-name {
    color: var(--text);
    font-weight: 700;
    font-size: 1rem;
}

.recipe-desc {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.85rem;
    line-height: 1.4;
}

.recipe-body {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 0.6rem;

    @media (max-width: 30rem) {
        grid-template-columns: 1fr;
        .recipe-arrow { display: none; }
    }
}

.recipe-ingredients {
    min-width: 0;

    &-title {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
        margin-bottom: 0.3rem;
    }

    ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    li {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        color: var(--text);
        font-size: 0.85rem;
    }

    .ing-icon {
        width: 1rem;
        text-align: center;
        color: var(--text-muted);
    }

    .ing-name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .ing-qty {
        font-variant-numeric: tabular-nums;
        color: var(--text-muted);

        &.is-not-enough {
            color: #ef5350;
            font-weight: 700;
        }
    }
}

.recipe-arrow {
    color: var(--text-muted);
    font-size: 1.1rem;
    padding: 0 0.25rem;
}

.recipe-output {
    width: 6.5rem;
}

.recipe-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    border-top: 0.0625rem solid var(--border);
    padding-top: 0.6rem;
}

.recipe-cost {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--primary);
    font-weight: 600;
    font-size: 0.85rem;
}

.recipe-cost-empty {
    flex: 1;
}
</style>

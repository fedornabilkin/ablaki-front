<script setup>
import {onMounted, ref, computed, watch} from 'vue';
import {useStore} from 'vuex';
import {NEmpty, NSpin, NInputNumber, NButton, NCard, NTag, useMessage} from 'naive-ui';
import {useCraftStore} from '@/store/craft';

const craft = useCraftStore();
const vuex = useStore();
const message = useMessage();

const qtys = ref({});
const user = computed(() => vuex.getters['auth/user']);
const balance = computed(() => Math.round((user.value?.person?.credit ?? 0) * 10) / 10);

const items = computed(() => craft.shop);
const loading = computed(() => !craft.shopLoaded);

const getQty = (id) => qtys.value[id] ?? 1;
const setQty = (id, v) => { qtys.value[id] = Math.max(1, Math.min(999, Number(v) || 1)); };

const haveOf = (id) => craft.inventoryMap.get(id) || 0;

const totalCost = (item) => item.price_credits * getQty(item.id);
const canAfford = (item) => balance.value >= totalCost(item);

const onBuy = async (item) => {
    const q = getQty(item.id);
    await craft.buyMaterial(item.id, q);
    if (craft.lastPurchase) {
        message.success(`Куплено ${craft.lastPurchase.qty}× ${craft.lastPurchase.item.name} за ${craft.lastPurchase.cost} Cr`);
        craft.clearResult();
        qtys.value[item.id] = 1;
    } else if (craft.lastError) {
        message.error(craft.lastError);
        craft.clearResult();
    }
};

onMounted(async () => {
    if (!craft.loaded) await craft.load();
    if (!craft.shopLoaded) await craft.loadShop();
});
</script>

<template>
    <div class="materials-shop">
        <header class="shop-header">
            <h5 class="shop-title">
                <font-awesome-icon icon="fa fa-cart-shopping"/>
                Магазин материалов
            </h5>
            <div class="shop-balance">
                <font-awesome-icon icon="fa fa-coins"/>
                <span class="shop-balance-value">{{ balance }}</span>
                <span class="shop-balance-cur">Cr</span>
            </div>
        </header>

        <p class="shop-hint">
            Покупай материалы за кредиты и используй их во вкладке
            <router-link to="/craft" class="shop-link">«Крафт»</router-link>.
        </p>

        <n-spin :show="loading">
            <n-empty v-if="!loading && items.length === 0" description="Магазин пуст" />
            <div v-else class="shop-grid">
                <n-card
                    v-for="item in items"
                    :key="item.id"
                    class="shop-card"
                    :class="{ 'is-rare': item.rarity === 'rare' }"
                    :bordered="true"
                >
                    <div class="shop-card-top">
                        <div class="shop-icon">
                            <font-awesome-icon :icon="item.getIcon ? item.getIcon() : item.icon"/>
                        </div>
                        <div class="shop-meta">
                            <div class="shop-name">{{ item.name }}</div>
                            <n-tag v-if="item.rarity !== 'common'" size="small" type="info" :bordered="false">
                                {{ item.rarity }}
                            </n-tag>
                            <div class="shop-have">В наличии: {{ haveOf(item.id) }}</div>
                        </div>
                    </div>

                    <p class="shop-desc">{{ item.description }}</p>

                    <div class="shop-card-actions">
                        <div class="shop-price">
                            <font-awesome-icon icon="fa fa-coins"/>
                            <span>{{ item.price_credits }} Cr</span>
                            <span class="shop-price-each">/ шт.</span>
                        </div>
                        <div class="shop-buy-row">
                            <n-input-number
                                :value="getQty(item.id)"
                                :min="1"
                                :max="999"
                                size="small"
                                style="width: 6rem;"
                                @update:value="(v) => setQty(item.id, v)"
                            />
                            <n-button
                                type="primary"
                                size="small"
                                :loading="craft.buying === item.id"
                                :disabled="!canAfford(item) || craft.buying === item.id"
                                @click="onBuy(item)"
                            >
                                <template #icon>
                                    <font-awesome-icon icon="fa fa-bag-shopping"/>
                                </template>
                                {{ canAfford(item) ? `Купить за ${totalCost(item)} Cr` : 'Не хватает' }}
                            </n-button>
                        </div>
                    </div>
                </n-card>
            </div>
        </n-spin>
    </div>
</template>

<style lang="scss" scoped>
.materials-shop {
    padding: 0.75rem 0.25rem;
}

.shop-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.4rem;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.shop-title {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text);
    font-size: 1.15rem;
}

.shop-balance {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--primary);
    font-weight: 700;
    font-size: 1rem;
}
.shop-balance-cur {
    color: var(--text-muted);
    font-weight: 400;
    font-size: 0.85rem;
}

.shop-hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin: 0.15rem 0 0.85rem;
}

.shop-link {
    color: var(--primary);
    text-decoration: underline;
}

.shop-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.6rem;

    @media (min-width: 36rem) {
        grid-template-columns: repeat(2, 1fr);
    }
    @media (min-width: 64rem) {
        grid-template-columns: repeat(3, 1fr);
    }
}

.shop-card {
    transition: border-color 0.15s ease;

    &.is-rare {
        border-color: rgba(33, 150, 243, 0.5) !important;
    }

    :deep(.n-card__content) {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        height: 100%;
    }
}

.shop-card-top {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
}

.shop-icon {
    flex-shrink: 0;
    width: 2.6rem;
    height: 2.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--primary-soft);
    color: var(--primary);
    border-radius: 0.5rem;
    font-size: 1.4rem;
}

.shop-meta {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}

.shop-name {
    font-weight: 700;
    color: var(--text);
}

.shop-have {
    font-size: 0.75rem;
    color: var(--text-muted);
}

.shop-desc {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.4;
    min-height: 2.4em;
}

.shop-card-actions {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    padding-top: 0.4rem;
    border-top: 0.0625rem solid var(--border);
}

.shop-price {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--primary);
    font-weight: 700;
}

.shop-price-each {
    color: var(--text-muted);
    font-weight: 400;
    font-size: 0.75rem;
}

.shop-buy-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: space-between;
}
</style>

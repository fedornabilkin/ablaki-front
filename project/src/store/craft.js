import {defineStore} from 'pinia';
import {itemApi, recipeApi, inventoryApi, craftApi, shopApi} from '@/services/api/craft';
import {ItemBuilder, RecipeBuilder} from '@/entities/craft/builder';
import {store as vuexStore} from '@/store/store';
import {isCraftMockMode} from '@/services/craft/mock';

const buildItems = (raw = []) => {
    const list = [];
    const b = new ItemBuilder();
    for (const data of raw) {
        b.build(data);
        list.push(b.getEntity());
    }
    return list;
};

const buildRecipes = (raw = []) => {
    const list = [];
    const b = new RecipeBuilder();
    for (const data of raw) {
        b.build(data);
        list.push(b.getEntity());
    }
    return list;
};

const buildInventory = (raw = []) => {
    const b = new ItemBuilder();
    return raw.map(entry => {
        b.build(entry.item);
        return { item: b.getEntity(), qty: Number(entry.qty || 0) };
    });
};

const userBalance = () => Number(vuexStore?.getters?.['auth/user']?.person?.credit ?? 0);

export const useCraftStore = defineStore('craft', {
    state: () => ({
        items: [],
        recipes: [],
        inventory: [],
        shop: [],
        crafting: null,
        buying: null,
        loading: false,
        loaded: false,
        shopLoaded: false,
        lastResult: null,
        lastPurchase: null,
        lastError: null,
    }),

    getters: {
        inventoryMap: (s) => {
            const m = new Map();
            for (const entry of s.inventory) m.set(entry.item.id, entry.qty);
            return m;
        },
        materials: (s) => s.inventory.filter(e => e.item.isMaterial?.()),
        products: (s) => s.inventory.filter(e => e.item.isProduct?.()),
        balance: () => userBalance(),
    },

    actions: {
        async load() {
            this.loading = true;
            try {
                const [items, recipes, inv] = await Promise.all([
                    itemApi.index().catch(() => []),
                    recipeApi.index().catch(() => []),
                    inventoryApi.my().catch(() => []),
                ]);
                this.items = buildItems(items);
                this.recipes = buildRecipes(recipes);
                this.inventory = buildInventory(inv);
            } finally {
                this.loaded = true;
                this.loading = false;
            }
        },

        async loadShop() {
            try {
                const list = await shopApi.list();
                this.shop = buildItems(list);
            } catch (e) {
                this.shop = [];
            } finally {
                this.shopLoaded = true;
            }
        },

        async craft(recipeId) {
            if (this.crafting) return;
            this.crafting = recipeId;
            this.lastError = null;
            try {
                const res = await craftApi.execute(recipeId);
                this.lastResult = {
                    item: buildItems([res.result_item])[0],
                    qty: res.qty,
                    recipeId,
                };
                if (Array.isArray(res.inventory)) {
                    this.inventory = buildInventory(res.inventory);
                } else {
                    await this.refreshInventory();
                }
            } catch (e) {
                this.lastError = e?.errors?.reason || e?.message || 'Не удалось скрафтить';
                this.lastResult = null;
            } finally {
                this.crafting = null;
            }
        },

        async buyMaterial(itemId, qty = 1) {
            if (this.buying) return;
            const item = this.shop.find(i => i.id === Number(itemId))
                || this.items.find(i => i.id === Number(itemId));
            if (!item || !item.price_credits) {
                this.lastError = 'Этот предмет не продаётся';
                return;
            }
            const q = Math.max(1, Number(qty) || 1);
            const cost = item.price_credits * q;
            const balance = userBalance();
            if (balance < cost) {
                this.lastError = `Не хватает кредитов (нужно ${cost} Cr, есть ${balance} Cr)`;
                this.lastPurchase = null;
                return;
            }

            this.buying = item.id;
            this.lastError = null;
            try {
                // В моке списание кредитов — на нашей стороне; на бэке транзакцию
                // делает /craft-shop/{id}/buy и сам возвращает обновлённый баланс.
                if (isCraftMockMode()) {
                    vuexStore.dispatch('auth/addCredit', -cost);
                }
                const res = await shopApi.buy(item.id, q);
                if (Array.isArray(res?.inventory)) {
                    this.inventory = buildInventory(res.inventory);
                } else {
                    await this.refreshInventory();
                }
                this.lastPurchase = {
                    item: buildItems([res?.item || item])[0],
                    qty: res?.qty ?? q,
                    cost,
                };
            } catch (e) {
                // откат списания кредитов в моке
                if (isCraftMockMode()) {
                    vuexStore.dispatch('auth/addCredit', cost);
                }
                this.lastError = e?.errors?.reason || e?.message || 'Не удалось купить';
                this.lastPurchase = null;
            } finally {
                this.buying = null;
            }
        },

        async refreshInventory() {
            try {
                const inv = await inventoryApi.my();
                this.inventory = buildInventory(inv);
            } catch (e) { /* ignore */ }
        },

        clearResult() {
            this.lastResult = null;
            this.lastError = null;
            this.lastPurchase = null;
        },
    },
});

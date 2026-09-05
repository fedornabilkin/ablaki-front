import config from "@/config/config";

const STORAGE_KEY = 'ablakin_craft_mock_v3';

export const isCraftMockMode = () => {
    if (config.getParam('craftMock')) return true;
    const apiDomain = config.getParam('apiDomain');
    return !apiDomain || apiDomain === 'mock';
};

const seedItems = () => ([
    // материалы (продаются на бирже за кредиты)
    {id: 1,  code: 'wood',    name: 'Дерево',  description: 'Брусок мягкого дерева.',     icon: 'fa fa-tree',          category: 'material', rarity: 'common', price_credits: 12},
    {id: 2,  code: 'stone',   name: 'Камень',  description: 'Ровный речной булыжник.',     icon: 'fa fa-mountain',      category: 'material', rarity: 'common', price_credits: 15},
    {id: 3,  code: 'coal',    name: 'Уголь',   description: 'Кусок каменного угля.',        icon: 'fa fa-cubes',         category: 'material', rarity: 'common', price_credits: 25},
    {id: 4,  code: 'sticks',  name: 'Палки',   description: 'Связка тонких сухих палок.',   icon: 'fa fa-grip-lines',    category: 'material', rarity: 'common', price_credits: 6},
    {id: 5,  code: 'iron',    name: 'Железо',  description: 'Кованый железный слиток.',     icon: 'fa fa-wrench',        category: 'material', rarity: 'rare',   price_credits: 60},
    {id: 6,  code: 'plastic', name: 'Пластик', description: 'Пакет пластиковой крошки.',    icon: 'fa fa-bottle-water',  category: 'material', rarity: 'common', price_credits: 20},
    {id: 7,  code: 'copper',  name: 'Медь',    description: 'Кусок медной проволоки.',      icon: 'fa fa-ring',          category: 'material', rarity: 'common', price_credits: 35},
    {id: 8,  code: 'tin',     name: 'Олово',   description: 'Серый слиток олова.',          icon: 'fa fa-anchor',        category: 'material', rarity: 'common', price_credits: 22},
    {id: 9,  code: 'thread',  name: 'Нить',    description: 'Тонкая льняная нить.',         icon: 'fa fa-pen-nib',       category: 'material', rarity: 'common', price_credits: 8},
    {id: 10, code: 'leather', name: 'Кожа',    description: 'Лоскут выделанной кожи.',      icon: 'fa fa-shirt',         category: 'material', rarity: 'common', price_credits: 28},
    {id: 11, code: 'cloth',   name: 'Ткань',   description: 'Кусок льняной ткани.',         icon: 'fa fa-scroll',        category: 'material', rarity: 'common', price_credits: 14},
    {id: 12, code: 'rope',    name: 'Верёвка', description: 'Прочный шнур из пеньки.',      icon: 'fa fa-link',          category: 'material', rarity: 'common', price_credits: 10},
    {id: 13, code: 'silver',  name: 'Серебро', description: 'Серебряный слиток. Редкий.',   icon: 'fa fa-coins',         category: 'material', rarity: 'rare',   price_credits: 120},

    // готовые продукты (получаются крафтом, не покупаются)
    {id: 101, code: 'torch',    name: 'Факел',   description: 'Освещает тёмные углы.',         icon: 'fa fa-fire',                category: 'product', rarity: 'common', price_credits: 0},
    {id: 102, code: 'basket',   name: 'Корзина', description: 'Тара для трофеев.',             icon: 'fa fa-toolbox',             category: 'product', rarity: 'common', price_credits: 0},
    {id: 103, code: 'amulet',   name: 'Амулет',  description: 'Талисман удачи. Шепчет.',       icon: 'fa fa-gem',                 category: 'product', rarity: 'epic',   price_credits: 0},
    {id: 104, code: 'bow',      name: 'Лук',     description: 'Простой охотничий лук.',        icon: 'fa fa-bullseye',            category: 'product', rarity: 'rare',   price_credits: 0},
    {id: 105, code: 'sword',    name: 'Меч',     description: 'Кованый железный меч.',         icon: 'fa fa-shield-halved',       category: 'product', rarity: 'rare',   price_credits: 0},
    {id: 106, code: 'campfire', name: 'Костёр',  description: 'Греет и отпугивает диких.',     icon: 'fa fa-fire-flame-curved',   category: 'product', rarity: 'common', price_credits: 0},
]);

const seedRecipes = (items) => {
    const byCode = Object.fromEntries(items.map(i => [i.code, i]));
    return [
        {
            id: 1, name: 'Факел', description: 'Палка плюс ткань, пропитанная смолой.',
            output: byCode.torch, output_qty: 1, cost_credits: 0, time_seconds: 0, category: 'tools',
            ingredients: [
                {item: byCode.sticks, qty: 1},
                {item: byCode.cloth, qty: 1},
            ],
        },
        {
            id: 2, name: 'Корзина', description: 'Простая корзина из палок и верёвки.',
            output: byCode.basket, output_qty: 1, cost_credits: 0, time_seconds: 0, category: 'tools',
            ingredients: [
                {item: byCode.sticks, qty: 2},
                {item: byCode.rope, qty: 1},
            ],
        },
        {
            id: 3, name: 'Костёр', description: 'Уголь даёт жар на всю ночь.',
            output: byCode.campfire, output_qty: 1, cost_credits: 0, time_seconds: 0, category: 'tools',
            ingredients: [
                {item: byCode.sticks, qty: 3},
                {item: byCode.coal, qty: 2},
            ],
        },
        {
            id: 4, name: 'Лук', description: 'Из ветки и тетивы.',
            output: byCode.bow, output_qty: 1, cost_credits: 40, time_seconds: 0, category: 'weapons',
            ingredients: [
                {item: byCode.wood, qty: 2},
                {item: byCode.rope, qty: 1},
                {item: byCode.stone, qty: 1},
            ],
        },
        {
            id: 5, name: 'Меч', description: 'Лезвие, рукоять, обмотка из кожи.',
            output: byCode.sword, output_qty: 1, cost_credits: 80, time_seconds: 0, category: 'weapons',
            ingredients: [
                {item: byCode.iron, qty: 2},
                {item: byCode.wood, qty: 1},
                {item: byCode.leather, qty: 1},
            ],
        },
        {
            id: 6, name: 'Амулет', description: 'Серебро на шёлковой нити.',
            output: byCode.amulet, output_qty: 1, cost_credits: 60, time_seconds: 0, category: 'jewelry',
            ingredients: [
                {item: byCode.silver, qty: 1},
                {item: byCode.thread, qty: 1},
                {item: byCode.leather, qty: 1},
            ],
        },
    ];
};

// стартовый инвентарь — пусто, материалы покупаются на бирже
const seedInventory = () => ({});

class CraftMockBackend {
    constructor() {
        this.state = this._loadOrSeed();
    }

    _loadOrSeed() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.items && parsed.recipes && parsed.inventory) return parsed;
            }
        } catch (e) { /* ignore */ }
        return this._seed();
    }

    _seed() {
        const items = seedItems();
        return {
            items,
            recipes: seedRecipes(items),
            inventory: seedInventory(),
        };
    }

    _persist() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); }
        catch (e) { /* ignore */ }
    }

    listItems() {
        return Promise.resolve(this.state.items.slice());
    }

    listRecipes() {
        return Promise.resolve(this.state.recipes.slice());
    }

    viewRecipe(id) {
        const r = this.state.recipes.find(r => r.id === Number(id));
        return r ? Promise.resolve(r) : Promise.reject({errors: {id: 'not found'}});
    }

    myInventory() {
        const list = Object.entries(this.state.inventory)
            .filter(([, qty]) => qty > 0)
            .map(([itemId, qty]) => {
                const item = this.state.items.find(i => i.id === Number(itemId));
                return item ? {item, qty} : null;
            })
            .filter(Boolean);
        return Promise.resolve(list);
    }

    listShop() {
        const shop = this.state.items
            .filter(i => i.category === 'material' && i.price_credits > 0)
            .map(i => ({...i}));
        return Promise.resolve(shop);
    }

    /**
     * Прибавить материал в инвентарь. Списание кредитов делает стор через Vuex auth/addCredit,
     * чтобы у бэка это была одна транзакция — здесь только материал.
     */
    addMaterial(itemId, qty) {
        const item = this.state.items.find(i => i.id === Number(itemId) && i.category === 'material');
        if (!item) return Promise.reject({errors: {reason: 'Материал не найден'}});
        const q = Math.max(1, Number(qty) || 1);
        this.state.inventory[item.id] = (this.state.inventory[item.id] || 0) + q;
        this._persist();
        return this.myInventory().then(inventory => ({
            item,
            qty: q,
            inventory,
        }));
    }

    execute(recipeId) {
        const recipe = this.state.recipes.find(r => r.id === Number(recipeId));
        if (!recipe) return Promise.reject({errors: {reason: 'Рецепт не найден'}});

        for (const ing of recipe.ingredients) {
            const have = this.state.inventory[ing.item.id] || 0;
            if (have < ing.qty) {
                return Promise.reject({errors: {reason: `Не хватает «${ing.item.name}» (нужно ${ing.qty}, есть ${have})`}});
            }
        }

        for (const ing of recipe.ingredients) {
            this.state.inventory[ing.item.id] = (this.state.inventory[ing.item.id] || 0) - ing.qty;
        }
        const outId = recipe.output.id;
        this.state.inventory[outId] = (this.state.inventory[outId] || 0) + recipe.output_qty;
        this._persist();

        return this.myInventory().then(inventory => ({
            result_item: recipe.output,
            qty: recipe.output_qty,
            inventory,
        }));
    }

    reset() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
        this.state = this._seed();
        this._persist();
    }
}

let backendSingleton = null;
export const getCraftMockBackend = () => {
    if (!backendSingleton) backendSingleton = new CraftMockBackend();
    return backendSingleton;
};

export const mockApi = {
    item: {
        index: () => getCraftMockBackend().listItems(),
    },
    recipe: {
        index: () => getCraftMockBackend().listRecipes(),
        view: (id) => getCraftMockBackend().viewRecipe(id),
    },
    inventory: {
        my: () => getCraftMockBackend().myInventory(),
    },
    craft: {
        execute: (recipeId) => getCraftMockBackend().execute(recipeId),
    },
    shop: {
        list: () => getCraftMockBackend().listShop(),
        buy: (itemId, qty) => getCraftMockBackend().addMaterial(itemId, qty),
    },
};

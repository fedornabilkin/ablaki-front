export const materials = [
  {code: 'stick', name: 'Палка', icon: 'grip-lines'},
  {code: 'coal', name: 'Уголь', icon: 'cubes'},
  {code: 'stone', name: 'Камень', icon: 'mountain'},
  {code: 'iron', name: 'Железо', icon: 'wrench'},
  {code: 'leather', name: 'Кожа', icon: 'shirt'},
  {code: 'thread', name: 'Нить', icon: 'pen-nib'},
  {code: 'grain', name: 'Зерно', icon: 'seedling'},
  {code: 'meat', name: 'Сырое мясо', icon: 'apple-whole'},
  {code: 'vegetables', name: 'Овощи', icon: 'seedling'},
];
export const recipes = [
  {code: 'torch', name: 'Факел', icon: 'fire', ingredients: [{code: 'stick', qty: 1}, {code: 'coal', qty: 1}]},
  {code: 'campfire', name: 'Костёр', icon: 'fire-flame-curved', ingredients: [{code: 'stick', qty: 3}, {code: 'coal', qty: 2}, {code: 'stone', qty: 2}]},
  {code: 'axe', name: 'Каменный топор', icon: 'hammer', ingredients: [{code: 'stick', qty: 2}, {code: 'stone', qty: 3}]},
  {code: 'sword', name: 'Железный меч', icon: 'shield', ingredients: [{code: 'stick', qty: 1}, {code: 'iron', qty: 3}]},
  {code: 'pickaxe', name: 'Кирка', icon: 'hammer', ingredients: [{code: 'stick', qty: 2}, {code: 'iron', qty: 3}]},
  {code: 'shovel', name: 'Лопата', icon: 'wrench', ingredients: [{code: 'stick', qty: 2}, {code: 'iron', qty: 1}]},
  {code: 'bow', name: 'Лук', icon: 'bullseye', ingredients: [{code: 'stick', qty: 3}, {code: 'thread', qty: 2}]},
  {code: 'shield', name: 'Щит', icon: 'shield-halved', ingredients: [{code: 'stick', qty: 3}, {code: 'iron', qty: 2}, {code: 'leather', qty: 1}]},
  {code: 'armor', name: 'Кожаная броня', icon: 'shirt', ingredients: [{code: 'leather', qty: 5}, {code: 'thread', qty: 3}]},
  {code: 'helmet', name: 'Железный шлем', icon: 'shield', ingredients: [{code: 'iron', qty: 4}, {code: 'leather', qty: 1}]},
  {code: 'bread', name: 'Хлеб', icon: 'apple-whole', ingredients: [{code: 'grain', qty: 3}, {code: 'coal', qty: 1}]},
  {code: 'cooked_meat', name: 'Жареное мясо', icon: 'fire', ingredients: [{code: 'meat', qty: 1}, {code: 'coal', qty: 1}]},
  {code: 'stew', name: 'Овощное рагу', icon: 'apple-whole', ingredients: [{code: 'vegetables', qty: 3}, {code: 'coal', qty: 1}]},
];
export type Inventory = Record<string, number>;
export const startingCredits = 500;
export const prices: Record<string, number> = {stick: 2, coal: 5, stone: 3, iron: 15, leather: 10, thread: 4, grain: 3, meat: 8, vegetables: 4};
export function readCredits(raw: string | null): number {
  try {
    const value: unknown = raw ? JSON.parse(raw)?.credits : undefined;
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : startingCredits;
  } catch { return startingCredits; }
}
export function buyMaterial(inventory: Inventory, credits: number, code: string, qty: number) {
  if (!materials.some(item => item.code === code)) throw new Error('Материал не продаётся');
  if (!Number.isSafeInteger(qty) || qty < 1 || qty > 999) throw new Error('Выберите количество от 1 до 999');
  const cost = prices[code] * qty;
  if (!Number.isSafeInteger(credits) || credits < cost) throw new Error('Не хватает кредитов');
  const total = (inventory[code] ?? 0) + qty;
  if (!Number.isSafeInteger(total) || total < qty) throw new Error('Инвентарь заполнен');
  return {inventory: {...inventory, [code]: total}, credits: credits - cost, cost};
}
const addedMaterials: Inventory = {iron: 20, leather: 12, thread: 10, grain: 12, meat: 6, vegetables: 12};
export const starter = (): Inventory => ({stick: 20, coal: 12, stone: 12, ...addedMaterials});
const codes = [...materials, ...recipes].map(item => item.code);
export function readInventory(raw: string | null): Inventory {
  if (!raw) return starter();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return starter();
    const result: Inventory = {};
    for (const code of codes) {
      // Give existing workshops the new materials once, preserving spent supplies and crafted items.
      const qty = Object.prototype.hasOwnProperty.call(parsed, code)
        ? (parsed as Record<string, unknown>)[code]
        : addedMaterials[code] ?? 0;
      if (typeof qty !== 'number' || !Number.isSafeInteger(qty) || qty < 0) return starter();
      result[code] = qty;
    }
    return result;
  } catch { return starter(); }
}
export function createItem(inventory: Inventory, code: string): Inventory {
  const recipe = recipes.find(item => item.code === code);
  if (!recipe) throw new Error('Рецепт не найден');
  for (const ingredient of recipe.ingredients) {
    const have = inventory[ingredient.code] ?? 0;
    if (!Number.isSafeInteger(have) || have < ingredient.qty) throw new Error('Не хватает материалов');
  }
  const next = {...inventory};
  for (const ingredient of recipe.ingredients) next[ingredient.code] -= ingredient.qty;
  next[code] = (next[code] ?? 0) + 1;
  if (!Number.isSafeInteger(next[code])) throw new Error('Инвентарь заполнен');
  return next;
}

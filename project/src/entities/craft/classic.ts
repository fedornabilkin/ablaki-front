import type { CraftRecipe, CraftState } from '@/services/api/classicCraft';

export function craftRequirements(state: CraftState, recipe: CraftRecipe, quantity: number) {
  const reasons = [...recipe.locked_reasons];
  const stock = new Map(state.inventory.map(i => [i.item_id, i.quantity]));
  const items = new Map(state.items.map(i => [i.id, i]));
  const required = new Map(recipe.ingredients.map(i => [i.item_id, i.quantity * quantity]));
  const reserve = new Set(recipe.tools);
  const station = state.stations.find(s => s.id === recipe.station_id);
  if (recipe.station_id && !station) reasons.push('Станция недоступна');
  if (station?.item_id) reserve.add(station.item_id);
  reserve.forEach(id => required.set(id, (required.get(id) ?? 0) + 1));
  const resources = [...required].map(([id, needed]) => ({id, name: items.get(id)?.name ?? `#${id}`, needed, have: stock.get(id) ?? 0, retained: reserve.has(id), station: station?.item_id === id}));
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) reasons.push('Количество от 1 до 100');
  if (!items.get(recipe.item_id)?.active || resources.some(i => !items.get(i.id)?.active)) reasons.push('Предмет отключён');
  if (!recipe.ingredients.length) reasons.push('Не настроены ингредиенты');
  if (resources.some(i => i.have < i.needed)) reasons.push('Не хватает ресурсов');
  const cost = state.charge_credits ? recipe.cost_credits * quantity : 0;
  if (cost > state.credit) reasons.push('Не хватает кредитов');
  return {reasons, resources, cost};
}
export function maxCraftQuantity(state: CraftState, recipe: CraftRecipe): number {
  let low = 0, high = 100;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (craftRequirements(state, recipe, middle).reasons.length) high = middle - 1;
    else low = middle;
  }
  return low;
}

/** Deterministic DAG columns; corrupt/cyclic legacy content still renders without recursion. */
export function craftRoadmap(recipes: CraftRecipe[]) {
  const ids = new Set(recipes.map(r => r.id));
  const levels = new Map<number, number>();
  let remaining = [...recipes];
  for (let pass = 0; pass < recipes.length && remaining.length; pass++) {
    const ready = remaining.filter(r => r.requires.filter(id => ids.has(id)).every(id => levels.has(id)));
    if (!ready.length) break;
    ready.forEach(r => levels.set(r.id, Math.max(-1, ...r.requires.filter(id => ids.has(id)).map(id => levels.get(id)!)) + 1));
    const done = new Set(ready.map(r => r.id)); remaining = remaining.filter(r => !done.has(r.id));
  }
  const counts = new Map<number, number>();
  const fallback = Math.max(0, ...levels.values()) + 1;
  const nodes = recipes.map(recipe => {
    const level = levels.get(recipe.id) ?? fallback;
    const row = counts.get(level) ?? 0; counts.set(level, row + 1);
    return {recipe, x: 24 + level * 264, y: 50 + row * 116, level};
  });
  const byId = new Map(nodes.map(n => [n.recipe.id, n]));
  const edges = nodes.flatMap(node => node.recipe.requires.flatMap(id => {
    const from = byId.get(id); if (!from) return [];
    const x = from.x + 220, y = from.y + 44, end = node.x, mid = (x + end) / 2;
    return [{id: `${id}-${node.recipe.id}`, from: id, to: node.recipe.id, path: `M ${x} ${y} C ${mid} ${y}, ${mid} ${node.y + 44}, ${end} ${node.y + 44}`}];
  }));
  return {nodes, edges, width: Math.max(600, ...nodes.map(n => n.x + 244)), height: Math.max(380, ...nodes.map(n => n.y + 112))};
}

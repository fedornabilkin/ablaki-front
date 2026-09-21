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

export function craftEquipment(state: CraftState, recipe: CraftRecipe) {
  const items = new Map(state.items.map(item => [item.id, item]));
  const stock = new Map(state.inventory.map(item => [item.item_id, item.quantity]));
  const available = (id: number) => Boolean(items.get(id)?.active && (stock.get(id) ?? 0) >= 1);
  const badges = [...new Set(recipe.tools)].map(id => ({
    key: `tool-${id}`, icon: items.get(id)?.icon || 'wrench',
    label: `Инструмент: ${items.get(id)?.name ?? `#${id}`}`, available: available(id),
  }));
  if (recipe.station_id) {
    const station = state.stations.find(station => station.id === recipe.station_id);
    badges.push({key: `station-${recipe.station_id}`, icon: 'industry',
      label: `Станция: ${station?.name ?? `#${recipe.station_id}`}`,
      available: Boolean(station && (station.item_id === null || available(station.item_id))),
    });
  }
  return badges.map(badge => ({...badge, label: `${badge.label} — ${badge.available ? 'доступно' : 'отсутствует'}`}));
}

export const roadmapNodeSize = {width: 280, height: 104};

/** Layered layout with reserved lanes for edges spanning multiple columns. */
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
  const fallback = Math.max(0, ...levels.values()) + 1;
  recipes.forEach(recipe => { if (!levels.has(recipe.id)) levels.set(recipe.id, fallback); });
  type Vertex = {key: string; level: number; row: number; x: number; y: number; before: Vertex[]; after: Vertex[]};
  const layers: Vertex[][] = Array.from({length: Math.max(0, ...levels.values()) + 1}, () => []);
  function vertex(key: string, level: number): Vertex {
    const value: Vertex = {key, level, row: layers[level].length, x: 24 + level * 400, y: 0, before: [], after: []};
    layers[level].push(value);
    return value;
  }
  const byId = new Map(recipes.map(recipe => [recipe.id, vertex(`recipe-${recipe.id}`, levels.get(recipe.id)!)]));
  const routes = recipes.flatMap(recipe => [...new Set(recipe.requires)].flatMap(id => {
    const from = byId.get(id), to = byId.get(recipe.id)!;
    if (!from) return [];
    const chain = [from];
    for (let level = from.level + 1; level < to.level; level++) chain.push(vertex(`edge-${id}-${recipe.id}-${level}`, level));
    chain.push(to);
    if (from.level < to.level) for (let i = 1; i < chain.length; i++) {
      chain[i - 1].after.push(chain[i]); chain[i].before.push(chain[i - 1]);
    }
    return [{id: `${id}-${recipe.id}`, from: id, to: recipe.id, chain}];
  }));
  // Barycentric sweeps keep connected branches together instead of using catalog order.
  for (let pass = 0; pass < 8; pass++) {
    const forward = pass % 2 === 0;
    for (const layer of forward ? layers : [...layers].reverse()) {
      const center = (node: Vertex) => {
        const neighbors = forward ? node.before : node.after;
        return neighbors.length ? neighbors.reduce((sum, item) => sum + (item.row + .5) / layers[item.level].length, 0) / neighbors.length : (node.row + .5) / layer.length;
      };
      const centers = new Map(layer.map(node => [node, center(node)]));
      layer.sort((a, b) => centers.get(a)! - centers.get(b)! || a.row - b.row);
      layer.forEach((node, row) => { node.row = row; });
    }
  }
  const height = Math.max(380, Math.max(1, ...layers.map(layer => layer.length)) * 176 + 80);
  layers.forEach(layer => layer.forEach(node => { node.y = 40 + (node.row + .5) * (height - 80) / layer.length - roadmapNodeSize.height / 2; }));
  const nodes = recipes.map(recipe => {
    const {x, y, level} = byId.get(recipe.id)!;
    return {recipe, x, y, level};
  });
  const edges = routes.map(({chain, ...edge}, index) => {
    const first = chain[0], last = chain[chain.length - 1];
    let x = first.x + roadmapNodeSize.width, y = first.y + roadmapNodeSize.height / 2;
    let path = `M ${x} ${y}`;
    if (first.level >= last.level) {
      // Invalid legacy cycles go around the column, without recursive traversal.
      const lane = 8 + index % 8 * 4;
      path += ` C ${x + 40} ${y}, ${x + 40} ${lane}, ${x} ${lane} L ${last.x - 20} ${lane} L ${last.x - 20} ${last.y + roadmapNodeSize.height / 2} L ${last.x} ${last.y + roadmapNodeSize.height / 2}`;
    } else for (let i = 1; i < chain.length; i++) {
      const next = chain[i], endY = next.y + roadmapNodeSize.height / 2, mid = (x + next.x) / 2;
      path += ` C ${mid} ${y}, ${mid} ${endY}, ${next.x} ${endY}`;
      if (i < chain.length - 1) path += ` L ${next.x + roadmapNodeSize.width} ${endY}`;
      x = next.x + roadmapNodeSize.width; y = endY;
    }
    return {...edge, path};
  });
  return {nodes, edges, width: Math.max(600, ...nodes.map(node => node.x + roadmapNodeSize.width + 64)), height};
}

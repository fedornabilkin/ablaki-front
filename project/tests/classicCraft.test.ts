import { describe, expect, it } from 'vitest';
import { parseCraftState, type CraftRecipe, type CraftState } from '../src/services/api/classicCraft';
import { craftRequirements, craftRoadmap, maxCraftQuantity, craftEquipment, roadmapNodeSize } from '../src/entities/craft/classic';
const recipe: CraftRecipe = {id: 1, code: 'plank', name: 'Plank', description: '', category_id: 1, item_id: 2, station_id: null, output_quantity: 2, cost_credits: 3, experience: 20, min_level: 1, crafted: 0, ingredients: [{item_id: 1, quantity: 2}], tools: [1], requires: [], locked_reasons: []};
export const fixture: CraftState = {items: [1, 2].map(id => ({id, code: 'item' + id, name: 'Item ' + id, description: '', category_id: 1, kind: 'material', rarity: 'common', icon: 'cube', stack_size: 100, destroyable: 1, active: 1, use_xp: 0, gather_quantity: 0})), recipes: [recipe], categories: [{id: 1, name: 'Wood', code: 'wood', description: 'Woodworking'}], stations: [], skills: [], inventory: [{item_id: 1, quantity: 5}], inventory_slots: [{id: 10, item_id: 1, quantity: 5}], credit: 6, charge_credits: true, starter_available: false, gather_available: false, slot_limit: 100, slots_used: 1};
describe('classic craft contract and roadmap', () => {
  it('validates chest ownership, stable positions and active inventory capacity', () => {
    const state = {...fixture,
      items: [...fixture.items, {...fixture.items[0], id: 3, code: 'chest', storage_kind: 'chest' as const, stack_size: 1}],
      inventory_slots: [{id: 10, item_id: 1, quantity: 5, position: 1, active: true}, {id: 20, item_id: 3, quantity: 1, position: 2, active: true}], slots_used: 2, slot_limit: 50,
      permanent_slots: 20, active_slots: 25, slots_expire_at: 2000, server_time: 1000, slot_pricing: 'linear',
      inventory_settings: {slot_price: 10, elixir_slots: 5, elixir_days: 7, chest_slots: 10, chest_durability: 100, chest_wear: 1},
      containers: [{id: 20, capacity: 10, durability: 99, max_durability: 100, slots: [{id: 30, item_id: 1, quantity: 3, position: 1}], repair: {restore: 1, materials: [{item_id: 1, quantity: 1, have: 5, available: true}], tools: [{item_id: 2, durability: 99, max_durability: 100, have: 1, available: true}], station: {id: 1, name: 'Workbench', item_id: 2, durability: 98, max_durability: 100, available: true}, reasons: []}}],
    };
    expect(parseCraftState(state)).toEqual(state);
    expect(() => parseCraftState({...state, slot_pricing: 'unknown'})).toThrow();
    expect(() => parseCraftState({...state, containers: [{...state.containers[0], repair: {...state.containers[0].repair, station: {...state.containers[0].repair.station, durability: 101}}}]})).toThrow();
    expect(() => parseCraftState({...state, active_slots: 51})).toThrow();
    expect(() => parseCraftState({...state, containers: [{...state.containers[0], id: 999}]})).toThrow();
    expect(() => parseCraftState({...state, containers: [{...state.containers[0], slots: [{id: 10, item_id: 1, quantity: 3, position: 1}]}]})).toThrow();
    expect(() => parseCraftState({...state, inventory_slots: state.inventory_slots.map(slot => ({...slot, position: 1}))})).toThrow();
    for (const repair of [null, {...state.containers[0].repair, restore: -1}, {...state.containers[0].repair, materials: [{item_id: 1, quantity: -1, have: 5}]}, {...state.containers[0].repair, tools: [{item_id: 2, durability: 101, max_durability: 100}]}]) {
      expect(() => parseCraftState({...state, containers: [{...state.containers[0], repair}]})).toThrow();
    }
  });
  it('validates the full server state without trusting type assertions', () => {
    expect(parseCraftState(fixture)).toEqual(fixture);
    expect(() => parseCraftState({...fixture, credit: 'NaN'})).toThrow();
    expect(() => parseCraftState({...fixture, starter_available: 'yes'})).toThrow();
    expect(() => parseCraftState({...fixture, items: [...fixture.items, fixture.items[0]]})).toThrow();
    expect(() => parseCraftState({...fixture, inventory: [{item_id: 999, quantity: 1}]})).toThrow();
    expect(() => parseCraftState({...fixture, inventory_slots: [{id: 1, item_id: 999, quantity: 1}]})).toThrow();
    expect(() => parseCraftState({...fixture, inventory_slots: [...fixture.inventory_slots, fixture.inventory_slots[0]], slots_used: 2})).toThrow();
    expect(() => parseCraftState({...fixture, slots_used: 2})).toThrow();
  });
  it('adds a retained tool to batch ingredients and uses actual shared credits', () => {
    expect(maxCraftQuantity(fixture, recipe)).toBe(2);
    expect(craftRequirements(fixture, recipe, 2)).toMatchObject({cost: 6, reasons: [], resources: [{needed: 5, have: 5, retained: true}]});
    expect(craftRequirements(fixture, recipe, 3).reasons).toContain('Не хватает ресурсов');
    expect(craftRequirements(fixture, recipe, 3).reasons).toContain('Не хватает кредитов');
    expect(craftRequirements(fixture, recipe, 0).reasons).toContain('Количество от 1 до 100');
  });
  it('shows disabled stations and server unlock reasons', () => {
    expect(craftRequirements(fixture, {...recipe, station_id: 7, locked_reasons: ['Сначала создайте молоток']}, 1).reasons).toEqual(['Сначала создайте молоток', 'Станция недоступна']);
  });
  it('allows priced recipes without credits only when server charging is disabled', () => {
    const free = {...fixture, credit: 0, charge_credits: false};
    expect(craftRequirements(free, recipe, 2)).toMatchObject({cost: 0, reasons: []});
    expect(maxCraftQuantity(free, recipe)).toBe(2);
    expect(craftRequirements({...free, charge_credits: true}, recipe, 1).reasons).toContain('Не хватает кредитов');
    expect(parseCraftState({...fixture, charge_credits: undefined}).charge_credits).toBe(false);
    expect(() => parseCraftState({...fixture, charge_credits: 'false'})).toThrow();
  });
  it('lays out diamond dependencies once and handles bad legacy cycles finitely', () => {
    const rows = [recipe, {...recipe, id: 2, requires: [1]}, {...recipe, id: 3, requires: [1]}, {...recipe, id: 4, requires: [2, 3]}];
    const graph = craftRoadmap(rows);
    expect(graph.nodes.map(n => n.level)).toEqual([0, 1, 1, 2]);
    expect(graph.edges).toHaveLength(4);
    expect(craftRoadmap([{...recipe, requires: [1]}]).nodes).toHaveLength(1);
    expect(craftRoadmap([{...recipe, requires: [999]}]).edges).toHaveLength(0);
  });
  it('centers sparse layers and reserves an empty corridor for a long dependency', () => {
    const rows = [recipe, {...recipe, id: 2, requires: [1]}, {...recipe, id: 3, requires: [2]}, {...recipe, id: 4, requires: [1, 3]}];
    const graph = craftRoadmap(rows);
    expect(craftRoadmap(rows)).toEqual(graph);
    const root = graph.nodes[0], leaf = graph.nodes[3];
    expect(root.y).toBe(leaf.y);
    expect(root.y + roadmapNodeSize.height / 2).toBe(graph.height / 2);
    const longEdge = graph.edges.find(edge => edge.id === '1-4')!;
    const lanes = [...longEdge.path.matchAll(/ L ([\d.]+) ([\d.]+)/g)];
    expect(lanes).toHaveLength(2);
    for (const lane of lanes) {
      const x = Number(lane[1]), y = Number(lane[2]);
      expect(graph.nodes.some(node => x > node.x && x <= node.x + roadmapNodeSize.width && y > node.y && y < node.y + roadmapNodeSize.height)).toBe(false);
    }
  });
  it('untangles reversed sibling branches and leaves space between cards', () => {
    const rows = [recipe, {...recipe, id: 2}, {...recipe, id: 3, requires: [2]}, {...recipe, id: 4, requires: [1]}];
    const graph = craftRoadmap(rows), byId = new Map(graph.nodes.map(node => [node.recipe.id, node]));
    expect(Math.sign(byId.get(1)!.y - byId.get(2)!.y)).toBe(Math.sign(byId.get(4)!.y - byId.get(3)!.y));
    expect(Math.abs(byId.get(3)!.y - byId.get(4)!.y)).toBeGreaterThan(roadmapNodeSize.height + 40);
  });
  it('reports owned, missing and disabled tools and stations separately', () => {
    const equipped = {...fixture, stations: [{id: 7, name: 'Workbench', item_id: 1}]};
    expect(craftEquipment(equipped, {...recipe, station_id: 7}).map(badge => badge.available)).toEqual([true, true]);
    expect(craftEquipment({...equipped, inventory: []}, {...recipe, station_id: 7}).every(badge => !badge.available)).toBe(true);
    expect(craftEquipment({...equipped, items: equipped.items.map(item => ({...item, active: 0}))}, recipe)[0].available).toBe(false);
    expect(craftEquipment(fixture, {...recipe, tools: [], station_id: 99})[0].available).toBe(false);
    expect(craftEquipment({...fixture, stations: [{id: 7, name: 'Public', item_id: null}]}, {...recipe, tools: [], station_id: 7})[0].available).toBe(true);
  });
});

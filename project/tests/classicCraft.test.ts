import { describe, expect, it } from 'vitest';
import { parseCraftState, type CraftRecipe, type CraftState } from '../src/services/api/classicCraft';
import { craftRequirements, craftRoadmap, maxCraftQuantity } from '../src/entities/craft/classic';
const recipe: CraftRecipe = {id: 1, code: 'plank', name: 'Plank', description: '', category_id: 1, item_id: 2, station_id: null, output_quantity: 2, cost_credits: 3, experience: 20, min_level: 1, crafted: 0, ingredients: [{item_id: 1, quantity: 2}], tools: [1], requires: [], locked_reasons: []};
export const fixture: CraftState = {items: [1, 2].map(id => ({id, code: 'item' + id, name: 'Item ' + id, description: '', category_id: 1, kind: 'material', rarity: 'common', icon: 'cube', stack_size: 100, destroyable: 1, active: 1, use_xp: 0, gather_quantity: 0})), recipes: [recipe], categories: [{id: 1, name: 'Wood', code: 'wood', description: 'Woodworking'}], stations: [], skills: [], inventory: [{item_id: 1, quantity: 5}], inventory_slots: [{id: 10, item_id: 1, quantity: 5}], credit: 6, charge_credits: true, starter_available: false, gather_available: false, slot_limit: 100, slots_used: 1};
describe('classic craft contract and roadmap', () => {
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
});

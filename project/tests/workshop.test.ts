import {describe, expect, it} from 'vitest';
import {createItem, readInventory, starter, buyMaterial, readCredits, startingCredits} from '../src/services/craft/workshop';

describe('local workshop', () => {
  it('buys materials and saves inventory and remaining credits together', () => {
    const initial = {iron: 1};
    const purchase = buyMaterial(initial, 45, 'iron', 3);
    expect(purchase).toEqual({inventory: {iron: 4}, credits: 0, cost: 45});
    expect(initial).toEqual({iron: 1});
    const saved = JSON.stringify({...purchase.inventory, credits: purchase.credits});
    expect(readInventory(saved).iron).toBe(4);
    expect(readCredits(saved)).toBe(0);
  });
  it('rejects overspending and buying crafted products', () => {
    const inventory = {iron: 1};
    expect(() => buyMaterial(inventory, 14, 'iron', 1)).toThrow('Не хватает кредитов');
    expect(() => buyMaterial(inventory, 500, 'torch', 1)).toThrow('Материал не продаётся');
    expect(inventory).toEqual({iron: 1});
  });
  it.each([0, -1, 1.5, NaN, Infinity, 1000])('rejects invalid purchase quantity %s', qty => {
    expect(() => buyMaterial({}, 500, 'stick', qty)).toThrow('Выберите количество');
  });
  it('gives older saves a starting balance and preserves spent credits', () => {
    expect(readCredits(JSON.stringify({stick: 5}))).toBe(startingCredits);
    expect(readCredits('{"credits":0}')).toBe(0);
    expect(readCredits('{"credits":-1}')).toBe(startingCredits);
  });
  it('consumes materials, accumulates output and restores saved progress', () => {
    const initial = starter();
    const first = createItem(initial, 'torch');
    const second = createItem(first, 'torch');
    expect(initial).toEqual(starter());
    expect(second).toEqual({...starter(), stick: 18, coal: 10, torch: 2});
    expect(readInventory(JSON.stringify(second))).toMatchObject(second);
  });
  it('rejects a craft without consuming any remaining ingredients', () => {
    const inventory = {stick: 1, coal: 0};
    expect(() => createItem(inventory, 'torch')).toThrow('Не хватает материалов');
    expect(inventory).toEqual({stick: 1, coal: 0});
  });
  it('upgrades old saves without restoring spent materials or losing products', () => {
    const upgraded = readInventory(JSON.stringify({stick: 0, coal: 2, stone: 4, torch: 10}));
    expect(upgraded).toMatchObject({stick: 0, coal: 2, stone: 4, torch: 10, iron: 20});
    upgraded.iron = 0;
    expect(readInventory(JSON.stringify(upgraded)).iron).toBe(0);
  });
  it.each(['null', '[]', '{"stick":-1}', '{"coal":1.5}', '{"stone":"8"}', 'broken'])('recovers from invalid storage: %s', raw => {
    expect(readInventory(raw)).toEqual(starter());
  });
});

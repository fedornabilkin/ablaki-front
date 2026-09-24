import { describe, expect, it } from 'vitest';
import { inventoryCells, insideTrash } from '../src/entities/craft/inventory';
describe('craft inventory slots', () => {
  it('renders one cell per real stack and pads to exactly 50 cells', () => {
    const slots = [{id: 41, item_id: 5, quantity: 100}, {id: 99, item_id: 5, quantity: 3}];
    const cells = inventoryCells(slots);
    expect(cells).toHaveLength(50);
    expect(cells.slice(0, 2)).toEqual(slots);
    expect(cells.filter(s => s === null)).toHaveLength(48);
    expect(inventoryCells([])).toEqual(Array(50).fill(null));
  });
  it('keeps legacy overflow in the source while the grid stays 10 by 5', () => {
    const slots = Array.from({length: 101}, (_, id) => ({id: id + 1, item_id: 5, quantity: 1}));
    expect(inventoryCells(slots)).toHaveLength(50); expect(slots).toHaveLength(101);
  });
  it('only accepts the trash rectangle including its boundaries', () => {
    const rect = {left: 10, top: 20, right: 70, bottom: 100};
    expect(insideTrash({x: 10, y: 100}, rect)).toBe(true);
    expect(insideTrash({x: 40, y: 60}, rect)).toBe(true);
    expect(insideTrash({x: 9, y: 60}, rect)).toBe(false);
    expect(insideTrash({x: 71, y: 60}, rect)).toBe(false);
    expect(insideTrash({x: 40, y: 19}, rect)).toBe(false);
    expect(insideTrash({x: 40, y: 101}, rect)).toBe(false);
  });
});

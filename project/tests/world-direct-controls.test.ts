import { describe, expect, it } from 'vitest';
import { mapAreaCells, mapPurchase } from '../src/entities/world/mapSelection';
import { discountedCredits } from '../src/entities/world/credits';
import { storageCells, storageTransfer } from '../src/entities/world/storageInteraction';
import type { StorageView } from '../src/services/api/worldStorage';

function storage(id: number, kind: StorageView['storage']['kind'] = 'backpack'): StorageView {
  return { storage: { id, kind, name: `Storage ${id}`, node_id: 1, container_inventory_id: null, capacity: 5, revision: 1 }, items: [], slots: [], container: null, location: null, total: 0, currentPage: 1, pageCount: 0, pageSize: 100, server_time: 1, writable: true };
}
describe('world area selection and displayed prices', () => {
  const cells = [{ x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 0 }];
  it('selects a reversed rectangle without fog, occupied cells or cells outside its bounds', () => {
    expect(mapAreaCells({ x: 1, y: 1 }, { x: -1, y: 0 }, cells, [{ x: 0, y: 1 }])).toEqual([{ x: 0, y: 0 }, { x: -1, y: 1 }, { x: 1, y: 1 }]);
    expect(mapAreaCells({ x: 1, y: 1 }, { x: -1, y: 0 }, cells, [], 2)).toHaveLength(2);
    expect(mapAreaCells({ x: 3, y: 3 }, { x: 4, y: 4 }, cells, [])).toEqual([]);
  });
  it('keeps exact decimal prices and rounds the discount down, like the server', () => {
    expect(discountedCredits(['10.0000', '12.0000', '14.4000'], 500)).toBe('34.5800');
    expect(discountedCredits(['0.0001'], 500)).toBe('0.0001');
    expect(discountedCredits(['999999999999.9999', '0.0001'])).toBe('1000000000000.0000');
    expect(mapPurchase({ paid_cells: 0, base_price: '10.0000', next_price: '10.0000', bulk_minimum: 3, discount_bps: 500, max_quantity: 100, currency: 'Cr' }, 3).total).toBe('57.0000');
  });
});
describe('storage cell destinations', () => {
  const item = { id: 10, item_id: 2, name: 'Доска', icon: 'cube', quantity: 20, position: 1, revision: 1, instances: [], inner_storage_id: null };
  it('keeps overflow visible and does not mark a closed placement slot as available', () => {
    const view = storage(1, 'placement'); view.items = [{ ...item, position: 103 }];
    view.slots = [{ position: 1, type: 'station', exposure_class: 'outdoor', available: true }];
    expect(storageCells(view)[0].available).toBe(true);
    expect(storageCells(view)[1].available).toBe(false);
    expect(storageCells(view, 2)[2]).toMatchObject({ position: 103, available: false, item: { id: 10 } });
  });
  it('allows moving and merging the selected quantity, but rejects occupied, closed and identical cells', () => {
    const source = storage(1), target = storage(2); source.items = [item];
    expect(storageTransfer(source, item, target, 1, 5, null)).toMatchObject({ inventory_id: 10, destination_storage_id: 2, quantity: 5, position: 1 });
    target.items = [{ ...item, id: 11 }];
    expect(storageTransfer(source, item, target, 1, 5, null)).not.toBeNull();
    target.items[0].item_id = 3;
    expect(storageTransfer(source, item, target, 1, 5, null)).toBeNull();
    expect(storageTransfer(source, item, source, 1, 5, null)).toBeNull();
    expect(storageTransfer(source, item, target, 6, 1, null)).toBeNull();
    expect(storageTransfer(source, item, target, 2, 21, null)).toBeNull();
    target.writable = false;
    expect(storageTransfer(source, item, target, 2, 1, null)).toBeNull();
  });
  it('requires one available instance and an active placement cell', () => {
    const source = storage(1), target = storage(2, 'placement');
    const unit = { ...item, instances: [{ id: 40, durability: 10, max_durability: 20, exposure_class: 'carried' as const }] }; source.items = [unit];
    target.slots = [{ position: 2, type: 'station', available: true, exposure_class: 'outdoor' }];
    expect(storageTransfer(source, unit, target, 2, 1, 40)).not.toBeNull();
    expect(storageTransfer(source, unit, target, 2, 2, null)).toBeNull();
    expect(storageTransfer(source, unit, target, 2, 1, 41)).toBeNull();
    expect(storageTransfer(source, unit, target, 1, 1, null)).toBeNull();
  });
});

import { projectedWorkSeconds } from '../src/entities/world/workProgress';
import { pixelToWorld, worldToPixel } from '../src/entities/world/coordinates';
import { describe, expect, it } from 'vitest';
import { mapAreaCells, mapPurchase } from '../src/entities/world/mapSelection';
import { discountedCredits, formatCredits, needsPersonalTopUp } from '../src/entities/world/credits';
import { optimisticTransfer, storageCells, storageTransfer } from '../src/entities/world/storageInteraction';
import type { StorageView } from '../src/services/api/worldStorage';
import type { StorageMapContext } from '../src/entities/world/storageInteraction';
import type { WorldNode } from '../src/entities/world/types';

function storage(id: number, kind: StorageView['storage']['kind'] = 'backpack'): StorageView {
  return { storage: { id, kind, name: `Storage ${id}`, node_id: 1, container_inventory_id: null, capacity: 5, revision: 1 }, items: [], slots: [], container: null, location: null, total: 0, currentPage: 1, pageCount: 0, pageSize: 100, server_time: 1, writable: true };
}
describe('world area selection and displayed prices', () => {
  it('keeps adjacent cells cheap and applies the distant-ring multiplier before a bulk discount', () => {
    const pricing = {paid_cells: 0, base_price: '0.5000', next_price: '0.5000', curve: 'rings' as const, outer_ring_multiplier: 10, bulk_minimum: 3, discount_bps: 500, max_quantity: 100, currency: 'Cr' as const};
    expect(mapPurchase(pricing, [{x: 1, y: 0}, {x: 2, y: 0}])).toMatchObject({total: '10.5000', unitPrices: ['0.5000', '10.0000']});
    expect(mapPurchase(pricing, [{x: 1, y: 0}, {x: 2, y: 0}, {x: 0, y: 2}]).total).toBe('19.4750');
  });
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
  it('projects split, merge and moves within one storage without changing the rollback snapshot', () => {
    const source = storage(1), target = storage(2); source.items = [{ ...item }];
    target.items = [{ ...item, id: 11, quantity: 3 }];
    const input = storageTransfer(source, source.items[0], target, 1, 5, null)!;
    const [from, to] = optimisticTransfer(source, target, input);
    expect(from.items[0].quantity).toBe(15); expect(to.items[0].quantity).toBe(8);
    expect(source.items[0].quantity).toBe(20); expect(target.items[0].quantity).toBe(3);
    const [moved, same] = optimisticTransfer(source, source, storageTransfer(source, source.items[0], source, 2, 20, null)!);
    expect(moved).toBe(same); expect(moved.items).toHaveLength(1); expect(moved.items[0].position).toBe(2);
  });
  it('displays exact large amounts and negatives with at most one fractional digit', () => {
    expect(formatCredits('0.0000')).toBe('0'); expect(formatCredits('12.0000')).toBe('12');
    expect(formatCredits('12.3500')).toBe('12.4'); expect(formatCredits('-0.0499')).toBe('0');
    expect(formatCredits('899999999999999.9500')).toBe('900000000000000');
  });
  it('keeps overflow visible and does not mark a closed placement slot as available', () => {
    const view = storage(1, 'placement'); view.items = [{ ...item, position: 103 }];
    view.slots = [{ position: 1, type: 'station', exposure_class: 'outdoor', available: true }];
    expect(storageCells(view)[0].available).toBe(true);
    expect(storageCells(view)[1].available).toBe(false);
    expect(storageCells(view, 2)[2]).toMatchObject({ position: 103, available: false, item: { id: 10 } });
  });
  it('maps placement slots to the active node, hides fog and prices discovered cells with the map curve', () => {
    const view = storage(1, 'placement'); view.storage.capacity = 9;
    view.slots = [{ position: 5, type: 'equipment', exposure_class: 'outdoor', available: true }, { position: 6, type: 'equipment', exposure_class: 'outdoor', available: false }];
    const context: StorageMapContext = { bounds: { x: -1, y: -1, width: 3, height: 3 }, map: { node_id: 1, items: [], can_expand: true, cells: [{ x: 0, y: 0, state: 'open' }, { x: 1, y: 0, state: 'discovered' }], pricing: { paid_cells: 1, base_price: '10.0000', next_price: '10.0000', curve: 'rings', bulk_minimum: 3, discount_bps: 500, max_quantity: 100, currency: 'Cr' } } };
    expect(storageCells(view, 1, context)).toMatchObject([
      { position: 5, available: true, purchase: false, point: { x: 0, y: 0 } },
      { position: 6, available: false, purchase: true, price: '10.0000', point: { x: 1, y: 0 } },
    ]);
    expect(storageTransfer(storage(2), item, view, 6, 1, null)).toBeNull();
    view.items = [{ ...item, position: 1 }];
    expect(storageCells(view, 1, context)[0]).toMatchObject({ position: 1, item: { id: 10 }, available: false });
  });
  it('does not filter a backpack or another node using an unrelated map', () => {
    const context: StorageMapContext = { bounds: { x: 0, y: 0, width: 3, height: 3 }, map: { node_id: 2, items: [], cells: [], can_expand: false } };
    expect(storageCells(storage(1), 1, context)).toHaveLength(5);
    expect(storageCells(storage(1, 'placement'), 1, context)).toHaveLength(5);
  });
  it('blocks object footprints and fog as transfer targets even when the slot response marks them available', () => {
    const source = storage(2), target = storage(1, 'placement'); source.items = [item]; target.storage.capacity = 9;
    target.slots = Array.from({ length: 9 }, (_, i) => ({ position: i + 1, type: 'equipment', exposure_class: 'outdoor', available: true }));
    const object = { id: 90, type: 'BUILDING', label: 'Шалаш', status: 'active', coordinates: { x: 0, y: 0 }, footprint: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 1 }] } as WorldNode;
    const context: StorageMapContext = { bounds: { x: -1, y: -1, width: 3, height: 3 }, map: { node_id: 1, items: [object], can_expand: true, cells: [{ x: -1, y: 0, state: 'open' }, { x: 0, y: 0, state: 'open' }, { x: 1, y: 0, state: 'open' }] } };
    expect(storageCells(target, 1, context)).toMatchObject([{ position: 4, available: true }, { position: 5, available: false, object: { label: 'Шалаш' } }, { position: 6, available: false, object: { label: 'Шалаш' } }]);
    expect(storageTransfer(source, item, target, 5, 1, null, context)).toBeNull();
    expect(storageTransfer(source, item, target, 6, 1, null, context)).toBeNull();
    expect(storageTransfer(source, item, target, 7, 1, null, context)).toBeNull();
    expect(storageTransfer(source, item, target, 4, 1, null, context)).not.toBeNull();
    object.status = 'archived';
    expect(storageCells(target, 1, context)[1]).toMatchObject({ available: true, object: undefined });
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

it('maps Cartesian cells to screen pixels and back, including negative coordinates', () => {
  const viewport = { minX: -3, maxY: 4 };
  expect(worldToPixel({ x: -1, y: 2 }, viewport, 72)).toEqual({ x: 144, y: 144 });
  expect(pixelToWorld({ x: 145, y: 143 }, viewport, 72)).toEqual({ x: -1, y: 3 });
  expect(pixelToWorld(worldToPixel({ x: 0, y: -2 }, viewport, 72), viewport, 72)).toEqual({ x: 0, y: -2 });
});


describe('server anchored work projection', () => {
  const work = { worked_seconds: 20, required_seconds: 120, server_time: 110, working: true, live_work: [{ accounted_at: 100, last_seen_at: 105 }] };
  it('advances smoothly from the last checkpoint and stops at the disconnect window', () => {
    expect(projectedWorkSeconds(work, 0)).toBe(30);
    expect(projectedWorkSeconds(work, 2.5)).toBe(32.5);
    expect(projectedWorkSeconds(work, 1000)).toBe(85);
    expect(projectedWorkSeconds({ ...work, working: false }, 1000)).toBe(20);
    expect(projectedWorkSeconds({ ...work, required_seconds: 40 }, 1000)).toBe(40);
  });
  it('accepts a new server checkpoint without double counting work', () => {
    const next = { ...work, worked_seconds: 40, server_time: 120, live_work: [{ accounted_at: 120, last_seen_at: 120 }] };
    expect(projectedWorkSeconds(work, 10)).toBe(projectedWorkSeconds(next, 0));
    expect(projectedWorkSeconds(next, 5)).toBe(45);
  });
});
describe('optional personal contributions', () => {
  it('requires a contribution only for a positive shortfall and known budget', () => {
    expect(needsPersonalTopUp('0.0001', '0')).toBe(true);
    expect(needsPersonalTopUp('0', '0')).toBe(false);
    expect(needsPersonalTopUp('10.0000', '10')).toBe(false);
    expect(needsPersonalTopUp('10', null)).toBe(false);
  });
});

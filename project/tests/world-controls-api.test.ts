import { loadGarden } from '../src/services/api/worldGarden';
import { harvestInput, loadHarvest } from '../src/services/api/worldHarvest';
import { occupiesCell } from '../src/entities/world/coordinates';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/services/httpClient';
import { loadStorageContents } from '../src/services/api/worldStorage';
import { parseWorkspace } from '../src/services/api/worldWorkspace';

const header = { id: 1, kind: 'backpack', name: 'Рюкзак', node_id: null, container_inventory_id: null, capacity: 100, revision: 3 };
function page(number: number, revision = 3) {
  return { storage: { ...header, revision }, items: [{ id: number, item_id: 1, name: 'Бревно', icon: 'tree', quantity: 5, position: number, revision: 1, instances: [], inner_storage_id: null }],
    slots: [], container: null, location: null, writable: true, server_time: 1, _meta: { totalCount: 2, perPage: 1, currentPage: number, pageCount: 2 } };
}
afterEach(() => vi.restoreAllMocks());
describe('complete storage grids', () => {
  it('loads occupied cells from every page before offering destinations', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: page(1) }).mockResolvedValueOnce({ data: page(2) });
    expect((await loadStorageContents(1)).items.map(item => item.position)).toEqual([1, 2]);
    expect(get).toHaveBeenCalledTimes(2);
  });
  it('rejects mixed storage revisions instead of displaying stale empty cells', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: page(1) }).mockResolvedValueOnce({ data: page(2, 4) });
    await expect(loadStorageContents(1)).rejects.toThrow('storage-changed');
  });
  it('rejects duplicate cell positions across pages', async () => {
    const second = page(2); second.items[0].position = 1;
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: page(1) }).mockResolvedValueOnce({ data: second });
    await expect(loadStorageContents(1)).rejects.toThrow('storage-changed');
  });
});
describe('workspace tile icons', () => {
  const workspace = { node_id: 1, name: 'Мастерская', recipe_id: 2, recipes: [{ id: 2, name: 'Доска', quantity: 2, locked_reasons: [], available: true, availability_reasons: [] }], equipment: [], storages: [{ ...header, output_allowed: true }], writable: true, server_time: 1 };
  it('uses the item icon and stays compatible with older workspace responses', () => {
    expect(parseWorkspace(workspace).recipes[0].icon).toBe('cube');
    expect(parseWorkspace({ ...workspace, recipes: [{ ...workspace.recipes[0], icon: 'tree' }] }).recipes[0].icon).toBe('tree');
    expect(() => parseWorkspace({ ...workspace, recipes: [{ ...workspace.recipes[0], icon: {} }] })).toThrow('invalid-workspace-response');
  });
});

it('accepts enabled cultivation in garden development', async () => {
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { node_id: 1, cultivation_enabled: true, offer: null, garden: null, can_buy: false, can_expand: false, can_publish: false, site_budget_available: null, settlement_id: 2, settlement_name: 'Village', server_time: 1 } });
  await expect(loadGarden(1)).resolves.toMatchObject({ can_buy: false });
});
it('validates harvest slots and exact owner prices', async () => {
  expect(harvestInput('price', { inventory_id: 1, price: '2.5' })).toEqual({ inventory_id: 1, price: '2.5000' });
  expect(harvestInput('price', { inventory_id: 1, price: null })).toEqual({ inventory_id: 1, price: null });
  for (const price of ['-1', '0', '1.00001']) expect(() => harvestInput('price', { inventory_id: 1, price })).toThrow();
  expect(() => harvestInput('buy', { inventory_id: 1, quantity: 1.5 })).toThrow();
  const item = { inventory_id: 1, position: 1, name: 'Crop', icon: 'seedling', quantity: 7, price: '2.5000', harvested_at: 1, fresh_until: 1209601, spoiled: true };
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { node_id: 1, capacity: 5, items: [item], owned_by_me: true, writable: true, server_time: 1209601 } });
  expect((await loadHarvest(1)).items[0].quantity).toBe(7);
  get.mockResolvedValue({ data: { node_id: 1, capacity: 5, items: [item, { ...item, inventory_id: 2 }], owned_by_me: true, writable: true, server_time: 1 } });
  await expect(loadHarvest(1)).rejects.toThrow();
});
it('treats footprint cells as occupied even away from the object anchor', () => {
  const node = { coordinates: { x: 0, y: 0 }, footprint: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }] };
  expect(occupiesCell(node, { x: 1, y: 1 })).toBe(true);
  expect(occupiesCell(node, { x: 2, y: 1 })).toBe(false);
});

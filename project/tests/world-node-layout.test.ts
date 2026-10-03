import { afterEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { apiClient } from '../src/services/httpClient';
import { useWorldStore } from '../src/store/world';
import { nodeFeatures, tabForHash, tabsForNode } from '../src/entities/world/nodeLayout';
import { isWorldCommandPath, parseWorldCommandResult, parseWorldMap, parseWorldNode, parseWorldScreen } from '../src/services/api/world';
import { nodeTypes, type WorldCapabilities, type WorldNode } from '../src/entities/world/types';
import { parseCultivation } from '../src/services/api/worldCultivation';
import { premisesPublicationInput } from '../src/services/api/worldPremises';

const capabilities: WorldCapabilities = { contract_version: 1, schema_ready: true, world_read: true, world_write: true, storage_v2: true, economy_tick: true };
afterEach(() => vi.restoreAllMocks());
function screen(id = 10) {
  const current = { ...node('BUILDING'), id };
  return { contract_version: 1, server_time: 1, capabilities, navigation: { node: current, parent_id: current.parent_id, breadcrumbs: [current], siblings: { items: [], _meta: { totalCount: 0, pageCount: 0, currentPage: 1, perPage: 20 } } }, map: { node_id: id, items: [], cells: [], can_expand: true } };
}

it('accepts a complete screen and rejects partial or mismatched maps', () => {
  expect(parseWorldScreen(screen(), 10).navigation?.node.id).toBe(10);
  expect(() => parseWorldScreen(screen(), 11)).toThrow('invalid-world-response');
  expect(() => parseWorldScreen({ ...screen(), map: { ...screen().map, node_id: 11 } }, 10)).toThrow();
  expect(() => parseWorldScreen({ ...screen(), map: null }, 10)).toThrow();
  expect(() => parseWorldScreen({ ...screen(), navigation: null }, 10)).toThrow();
  expect(() => parseWorldScreen({ ...screen(), capabilities: { ...capabilities, world_read: false } }, 10)).toThrow();
  expect(parseWorldScreen({ ...screen(), navigation: null, map: null }, null).navigation).toBeNull();
});

it('loads each world screen with one HTTP call and refreshes it after changes', async () => {
  setActivePinia(createPinia());
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: screen() });
  const store = useWorldStore(); store.setSession(1);
  await store.load(null);
  expect(get).toHaveBeenCalledTimes(1);
  expect(get.mock.calls[0][1]?.params).toEqual({ view: 'home' });
  expect(store.node?.id).toBe(10); expect(store.map?.node_id).toBe(10);
  store.invalidate([10]);
  get.mockResolvedValueOnce({ data: { ...screen(), navigation: { ...screen().navigation, node: { ...screen().navigation.node, revision: 2 } } } });
  await store.load(10);
  expect(get).toHaveBeenCalledTimes(2);
  expect(get.mock.calls[1][1]?.params).toEqual({ include: 'map' });
  expect(store.node?.revision).toBe(2);
});

it('ignores a late page response after another node or account is selected', async () => {
  setActivePinia(createPinia());
  let resolve!: (value: unknown) => void;
  const get = vi.spyOn(apiClient, 'get').mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const store = useWorldStore(); store.setSession(1);
  const previous = store.load(10);
  get.mockResolvedValueOnce({ data: screen(11) });
  await store.load(11); resolve({ data: screen(10) }); await previous;
  expect(store.node?.id).toBe(11);
  get.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const oldAccount = store.load(11); store.setSession(2);
  resolve({ data: screen(11) }); await oldAccount;
  expect(store.node).toBeNull(); expect(store.map).toBeNull(); expect(store.capabilities).toBeNull();
});

it('clears prior page data when the server returns a failure or an empty world', async () => {
  setActivePinia(createPinia());
  const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: screen() });
  const store = useWorldStore(); await store.load(10);
  get.mockRejectedValueOnce(new Error('server failure'));
  await store.load(11);
  expect(store.node).toBeNull(); expect(store.map).toBeNull(); expect(store.error).not.toBe('');
  get.mockResolvedValueOnce({ data: { ...screen(), navigation: null, map: null } });
  await store.load(null); expect(store.node).toBeNull(); expect(store.error).toBe('');
});
function node(type: WorldNode['type'], details: WorldNode['details'] = {}, storage = true): WorldNode {
  return { id: 10, type, parent_id: 2, root_id: 1, name: 'Объект', status: 'active', visibility: 'public', revision: 1,
    coordinates: { x: 1, y: 2 }, footprint: null, child_count: 0, details, permissions: { manage: storage, storage, administer: false }, actions: [] };
}

it('uses the same navigation for every world node and adds campsite gameplay tabs', () => {
  const campsite = node('PLOT', { plot_kind: 'campsite' });
  const campTabs = tabsForNode(campsite, nodeFeatures(campsite, capabilities));
  expect(campTabs).toEqual(['map', 'life', 'workshop', 'finance', 'development', 'statistics']);
  expect(tabForHash('#shelter', campTabs)).toBe('life');
  expect(tabForHash('#nights', campTabs)).toBe('life');
  expect(tabForHash('#garden', campTabs)).toBe('development');
  expect(tabForHash('#settlement-orders', campTabs)).toBe('development');
  expect(tabForHash('#treasury-receipts', campTabs)).toBe('finance');
  expect(tabForHash('#unknown', campTabs)).toBe('map');
});

it('shows only applicable sections for parent nodes and private rooms', () => {
  const world = node('WORLD', {}, false);
  expect(tabsForNode(world, nodeFeatures(world, capabilities))).toEqual(['map', 'finance', 'statistics']);
  const settlement = node('SETTLEMENT', {}, false);
  expect(tabsForNode(settlement, nodeFeatures(settlement, capabilities))).toEqual(['map', 'finance', 'development', 'statistics']);
  const room = node('ROOM');
  expect(tabsForNode(room, nodeFeatures(room, capabilities))).toEqual(['map', 'life', 'workshop', 'statistics']);
  const shelter = node('BUILDING', { shelter_instance_id: 4 });
  expect(tabsForNode(shelter, nodeFeatures(shelter, capabilities))).toEqual(['map', 'statistics']);
  expect(tabForHash('#building-repair', tabsForNode(shelter, nodeFeatures(shelter, capabilities)))).toBe('map');
});

it('keeps the map and statistics available throughout the world hierarchy', () => {
  for (const type of nodeTypes) {
    const current = node(type);
    const tabs = tabsForNode(current, nodeFeatures(current, capabilities));
    expect(tabs[0]).toBe('map');
    expect(tabs).toContain('statistics');
  }
  const garden = node('PLOT', { plot_kind: 'garden' });
  expect(tabsForNode(garden, nodeFeatures(garden, capabilities))).toContain('development');
});

it('accepts campsite supplies and budget transfers through the shared command flow', () => {
  expect(isWorldCommandPath('/nodes/10/supplies-starter')).toBe(true);
  expect(isWorldCommandPath('/nodes/10/supplies-gather')).toBe(true);
  expect(isWorldCommandPath('/nodes/10/budget-grant')).toBe(true);
  expect(isWorldCommandPath('/nodes/10/map-explore')).toBe(true);
  expect(isWorldCommandPath('/nodes/10/map-buy')).toBe(true);
  expect(isWorldCommandPath('/nodes/10/unknown')).toBe(false);
  expect(parseWorldCommandResult({ contract_version: 1, operation_id: 'a'.repeat(32), request_key: 'b'.repeat(32),
    server_time: 1, changed_node_ids: [10, 11], amount: '2.0000', currency: 'Cr', grant_id: 3 })).toMatchObject({ amount: '2.0000', changed_node_ids: [10, 11] });
  expect(parseWorldCommandResult({ contract_version: 1, operation_id: 'a'.repeat(32), request_key: 'b'.repeat(32),
    server_time: 1, changed_node_ids: [10], changed_storage_ids: [5], message: 'Материалы получены.' })).toMatchObject({ changed_storage_ids: [5] });
});

it('preserves absolute coordinates and polygon vertices in the node contract', () => {
  const value = node('PLOT');
  value.coordinates = { x: -3, y: 7 };
  value.footprint = [{ x: -3, y: 7 }, { x: -1, y: 7 }, { x: -1, y: 8 }, { x: -3, y: 8 }];
  expect(parseWorldNode(value).footprint).toEqual(value.footprint);
  expect(parseWorldNode(value).coordinates).toEqual({ x: -3, y: 7 });
  expect(() => parseWorldNode({ ...value, footprint: [{ x: 1.5, y: 7 }] })).toThrow('invalid-world-response');
});

it('accepts both paginated legacy maps and maps with unlockable cells', () => {
  const child = node('REGION');
  const oldMap = parseWorldMap({ items: [child], _meta: { totalCount: 1, pageCount: 1, currentPage: 1, perPage: 20 } }, 1);
  expect(oldMap).toMatchObject({ items: [child], total: 1 });
  const newMap = parseWorldMap({ node_id: 1, items: [child], cells: [{ x: -3, y: 7, state: 'open' }], can_expand: true }, 1);
  expect(newMap).toMatchObject({ node_id: 1, items: [child], cells: [{ x: -3, y: 7, state: 'open' }], can_expand: true });
  expect(() => parseWorldMap({ node_id: 2, items: [], cells: [], can_expand: false }, 1)).toThrow('invalid-world-response');
});

it('separates cultivation and warehouse controls from parent finances', () => {
  const bed = node('BED', { unlocked: 1 });
  expect(tabsForNode(bed, nodeFeatures(bed, capabilities))).toContain('cultivation');
  expect(nodeFeatures(bed, capabilities).finance).toBe(false);
  expect(nodeFeatures(node('BED', { unlocked: 0 }), capabilities).cultivation).toBe(false);
  for (const kind of ['forge', 'workshop', 'warehouse']) {
    const building = node('BUILDING', { building_kind: kind });
    expect(nodeFeatures(building, capabilities).warehouse).toBe(true);
    expect(nodeFeatures(building, capabilities).finance).toBe(kind !== 'warehouse');
    expect(premisesPublicationInput({ name: 'Здание', kind, area: 2, slots: 1, price: '10.0000' }).kind).toBe(kind);
  }
  for (const action of ['dig', 'sow', 'water', 'harvest', 'cancel']) expect(isWorldCommandPath(`/beds/12/${action}`)).toBe(true);
  expect(isWorldCommandPath('/nodes/12/warehouse-expand')).toBe(true);
  expect(isWorldCommandPath('/beds/12/publish')).toBe(false);
});

it('keeps fixed map dimensions and rejects fractional map sizes', () => {
  const house = { ...node('BUILDING'), map: { x: 0, y: 0, width: 3, height: 3 }, has_finances: true };
  expect(parseWorldNode(house).map).toEqual(house.map);
  expect(() => parseWorldNode({ ...house, map: { ...house.map, width: 2.5 } })).toThrow();
});

it('parses crop expiry and missed watering without accepting invalid states', () => {
  const state = { bed_id: 12, dug: false, writable: true, server_time: 301, cycle: { id: 3, crop_revision_id: 1, name: 'Морковь', state: 'ripe', ready_at: 300, water_due_at: 120, water_deadline_at: 180, expires_at: 900, water_missed: true, yield_factor_bps: 5000, can_water: false } };
  expect(parseCultivation(state).cycle).toMatchObject({ expires_at: 900, yield_factor_bps: 5000, water_missed: true });
  expect(() => parseCultivation({ ...state, cycle: { ...state.cycle, state: 'paused' } })).toThrow();
});

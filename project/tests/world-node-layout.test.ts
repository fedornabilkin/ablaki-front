import { afterEach, expect, it, vi } from 'vitest';
import { watchEffect, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { apiClient } from '../src/services/httpClient';
import { useWorldStore } from '../src/store/world';
import { nodeFeatures, tabForHash, tabsForNode } from '../src/entities/world/nodeLayout';
import { isWorldCommandPath, parseWorldCommandResult, parseWorldMap, parseWorldNode, parseWorldScreen, parseWorldTreeScreen } from '../src/services/api/world';
import { loadNights } from '../src/services/api/worldNights';
import { treeNode } from '../src/entities/world/tree';
import type { WorldTreeNode } from '../src/entities/world/types';
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
  expect(get.mock.calls[0][1]?.params).toEqual({ view: 'home', include: 'tree' });
  expect(store.node?.id).toBe(10); expect(store.map?.node_id).toBe(10);
  store.invalidate([10]);
  get.mockResolvedValueOnce({ data: { ...screen(), navigation: { ...screen().navigation, node: { ...screen().navigation.node, revision: 2 } } } });
  await store.load(10);
  expect(get).toHaveBeenCalledTimes(2);
  expect(get.mock.calls[1][1]?.params).toEqual({ include: 'tree' });
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
  const campsite = { ...node('PLOT', { plot_kind: 'campsite' }), extensions: ['nights'] };
  const campTabs = tabsForNode(campsite, nodeFeatures(campsite, capabilities));
  expect(campTabs).toEqual(['map', 'workshop', 'finance', 'statistics']);
  expect(tabForHash('#shelter', campTabs)).toBe('map');
  expect(tabForHash('#nights', campTabs)).toBe('map');
  expect(tabForHash('#garden', campTabs)).toBe('map');
  expect(tabForHash('#settlement-orders', campTabs)).toBe('map');
  expect(tabForHash('#treasury-receipts', campTabs)).toBe('finance');
  expect(tabForHash('#unknown', campTabs)).toBe('map');
});

it('shows the same common sections for parent nodes, rooms and shelters', () => {
  const world = node('WORLD', {}, false);
  expect(tabsForNode(world, nodeFeatures(world, capabilities))).toEqual(['map', 'workshop', 'finance', 'statistics']);
  const settlement = node('SETTLEMENT', {}, false);
  expect(tabsForNode(settlement, nodeFeatures(settlement, capabilities))).toEqual(['map', 'workshop', 'finance', 'statistics']);
  const room = node('ROOM');
  expect(tabsForNode(room, nodeFeatures(room, capabilities))).toEqual(['map', 'workshop', 'finance', 'statistics']);
  const shelter = node('BUILDING', { shelter_instance_id: 4 });
  expect(tabsForNode(shelter, nodeFeatures(shelter, capabilities))).toEqual(['map', 'workshop', 'finance', 'statistics']);
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
  expect(tabsForNode(garden, nodeFeatures(garden, capabilities))).not.toContain('development');
});

it('uses identical base tabs and rights for all kinds, including legacy special metadata', () => {
  for (const type of nodeTypes) for (const status of ['active', 'constructing']) for (const owned of [true, false]) {
    const current = { ...node(type, { plot_kind: 'campsite', building_kind: 'warehouse', shelter_instance_id: 4, unlocked: 1 }, owned), status, owned_by_me: owned };
    const features = nodeFeatures(current, capabilities);
    expect(tabsForNode(current, features)).toEqual(['map', 'workshop', 'finance', 'statistics']);
    expect(features.storage).toBe(owned);
    expect(features.finance).toBe(true);
    expect(features.housing || features.nights || features.cultivation).toBe(false);
  }
});

it('retains explicit extensions while keeping the common interface unchanged', () => {
  for (const type of nodeTypes) {
    const current = { ...node(type), extensions: ['nights', 'cultivation', 'mining'] };
    expect(tabsForNode(current, nodeFeatures(current, capabilities))).toEqual(['map', 'cultivation', 'workshop', 'finance', 'statistics']);
    expect(nodeFeatures({ ...current, status: 'constructing' }, capabilities).cultivation).toBe(false);
  }
});

it('accepts declared extensions and rejects malformed capability values', () => {
  expect(parseWorldNode({ ...node('BED'), extensions: ['cultivation'] }).extensions).toEqual(['cultivation']);
  expect(() => parseWorldNode({ ...node('BED'), extensions: [true] })).toThrow('invalid-world-response');
});

it('opens new construction and budgets inside the restored world screen', () => {
  for (const type of ['ROOM', 'CHEST', 'PLOT'] as const) {
    const current = { ...node(type, type === 'PLOT' ? { plot_kind: 'garden' } : {}), owned_by_me: true };
    expect(parseWorldNode(current).type).toBe(type);
    expect(tabsForNode(current, nodeFeatures(current, capabilities))).toEqual(expect.arrayContaining(['map', 'finance']));
  }
  const place = { ...node('PLACE'), status: 'constructing' };
  expect(parseWorldNode(place).type).toBe('PLACE');
  expect(tabsForNode(place, nodeFeatures(place, capabilities))).not.toContain('development');
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

it('adds explicit cultivation without changing common finances or storage', () => {
  const bed = { ...node('BED', { unlocked: 1 }), extensions: ['cultivation'] };
  expect(tabsForNode(bed, nodeFeatures(bed, capabilities))).toContain('cultivation');
  expect(nodeFeatures(bed, capabilities).finance).toBe(true);
  expect(nodeFeatures(node('BED', { unlocked: 0 }), capabilities).cultivation).toBe(false);
  for (const kind of ['forge', 'workshop', 'warehouse']) {
    const building = node('BUILDING', { building_kind: kind });
    expect(nodeFeatures(building, capabilities).finance).toBe(true);
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

it('keeps the current screen mounted during a command refresh', async () => {
  setActivePinia(createPinia());
  const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: screen() });
  const store = useWorldStore(); await store.load(10);
  const before = store.node, map = store.map;
  let resolve!: (value: unknown) => void;
  get.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  store.invalidate([10], true); const refreshing = store.load(10, true);
  expect(store.node).toBe(before); expect(store.map).toBe(map); expect(store.loading).toBe(true);
  resolve({ data: { ...screen(), navigation: { ...screen().navigation, node: { ...screen().navigation.node, revision: 2 } } } });
  await refreshing;
  expect(store.node?.revision).toBe(2); expect(store.loading).toBe(false);
});

function branch(id: number, parent: number | null, children: WorldTreeNode[] = [], loaded = true): WorldTreeNode {
  const result = treeNode(parseWorldNode({ ...node('BUILDING'), id, parent_id: parent, root_id: 1, child_count: children.length,
    map: { x: 0, y: 0, width: 3, height: 3 }, has_finances: true, details: { condition: 60, max_condition: 100, repair_active: false } }));
  return { ...result, children, children_loaded: loaded };
}
function nestedScreen(focus = 10) {
  const world = branch(1, null, [branch(10, 1, [branch(20, 10)]), branch(11, 1)], false);
  const selected = focus === 10 ? world.children[0] : world;
  Object.assign(selected.map!, { cells: [{ x: 0, y: 0, state: 'open' }], equipment_cells: [], can_expand: true });
  if (focus === 1) world.children_loaded = true;
  return { contract_version: 1, tree_version: 1, server_time: 100, capabilities, focus_id: focus, world };
}

it('validates a nested world and shares map and breadcrumb object references', () => {
  const parsed = parseWorldTreeScreen(nestedScreen(), 10);
  const focused = parsed.world!.children[0];
  expect(parsed.navigation!.node).toBe(focused);
  expect(parsed.navigation!.breadcrumbs[0]).toBe(parsed.world);
  expect(parsed.map!.items).toBe(focused.children);
  expect(focused.geo.coordinates).toBe(focused.coordinates);
  expect(focused.state.details).toBe(focused.details);
  const mismatch = nestedScreen(); mismatch.world.children[0].parent_id = 11;
  expect(() => parseWorldTreeScreen(mismatch, 10)).toThrow();
  const duplicate = nestedScreen(); duplicate.world.children[1].id = 10;
  expect(() => parseWorldTreeScreen(duplicate, 10)).toThrow();
  const truncated = nestedScreen(); truncated.world.children[0].children_loaded = false;
  expect(() => parseWorldTreeScreen(truncated, 10)).toThrow();
  expect(() => parseWorldTreeScreen(nestedScreen(), 11)).toThrow();
});

it('updates nested fields reactively without replacing world, nodes or children arrays', async () => {
  setActivePinia(createPinia());
  const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: nestedScreen() });
  const store = useWorldStore(); store.setSession(1); await store.load(10);
  const root = store.world!, focus = store.node!, child = focus.children[0], children = focus.children, details = focus.state.details, map = store.map;
  let condition = 0; const stop = watchEffect(() => { condition = focus.state.details.condition as number; });
  const update = nestedScreen(); update.world.children[0].state.revision = 2;
  update.world.children[0].state.details.condition = 75; update.world.children[0].construction.condition = 75;
  get.mockResolvedValueOnce({ data: update }); await store.load(10, true); await nextTick();
  expect(store.world).toBe(root); expect(store.node).toBe(focus); expect(store.node!.children).toBe(children);
  expect(store.node!.children[0]).toBe(child); expect(focus.state.details).toBe(details); expect(store.map).toBe(map);
  expect(condition).toBe(75); expect(focus.details.condition).toBe(75); stop();
});

it('preserves visited descendants on partial ancestor snapshots and removes confirmed missing branches', async () => {
  setActivePinia(createPinia());
  const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: nestedScreen() });
  const store = useWorldStore(); await store.load(10); const focus = store.node!, child = focus.children[0];
  const ancestor = nestedScreen(1); ancestor.world.children[0].children = []; ancestor.world.children[0].children_loaded = false;
  get.mockResolvedValueOnce({ data: ancestor }); await store.load(1);
  expect(store.world!.children[0]).toBe(focus); expect(focus.children[0]).toBe(child);
  const deletion = nestedScreen(); deletion.world.children[0].children = []; deletion.world.children[0].child_count = 0;
  deletion.world.children[0].state.revision = 2;
  get.mockResolvedValueOnce({ data: deletion }); await store.load(10);
  expect(focus.children).toEqual([]); expect(store.map!.items).toBe(focus.children);
  get.mockResolvedValueOnce({ data: nestedScreen() }); await store.load(10);
  expect(focus.children).toEqual([]);
  const restored = nestedScreen(); restored.world.children[0].state.revision = 3;
  get.mockResolvedValueOnce({ data: restored }); await store.load(10);
  expect(focus.children[0]).not.toBe(child);
});

it('does not roll a newer node revision back and clears private trees with the session', async () => {
  setActivePinia(createPinia());
  const newer = nestedScreen(); newer.world.children[0].state.revision = 3;
  const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: newer });
  const store = useWorldStore(); store.setSession(1); await store.load(10);
  get.mockResolvedValueOnce({ data: nestedScreen() }); await store.load(10);
  expect(store.node!.revision).toBe(3);
  store.setSession(2); expect(store.world).toBeNull(); expect(store.node).toBeNull();
});

it('reparents a known child without leaving it in a partially loaded old parent', async () => {
  setActivePinia(createPinia());
  const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: nestedScreen() });
  const store = useWorldStore(); await store.load(10); const moved = store.node!.children[0];
  const update = nestedScreen(1), oldParent = update.world.children[0], newParent = update.world.children[1];
  oldParent.children = []; oldParent.child_count = 0; oldParent.children_loaded = false;
  oldParent.state.revision = 2;
  newParent.children = [branch(20, 11)]; newParent.child_count = 1; newParent.state.revision = 2;
  newParent.children[0].state.revision = 2;
  get.mockResolvedValueOnce({ data: update }); await store.load(1);
  expect(store.world!.children[0].children).toEqual([]);
  expect(store.world!.children[1].children[0]).toBe(moved);
  expect(moved.parent_id).toBe(11);
});

it('clears cached private objects when access to the open branch is revoked', async () => {
  setActivePinia(createPinia());
  const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: nestedScreen() });
  const store = useWorldStore(); await store.load(10);
  get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } });
  await store.load(10, true);
  expect(store.world).toBeNull(); expect(store.node).toBeNull(); expect(store.map).toBeNull();
});

it('loads at most 30 newest nights and accepts server work penalties', async () => {
  const rules = { id: 1, version: 1, activated_at: 0, day_seconds: 3600, night_offset: 1000, night_seconds: 600, max_severity: 3, recovery_nights: 3, mild_efficiency_bps: 8000, severe_efficiency_bps: 5000 };
  const history = Array.from({ length: 30 }, (_, n) => ({ id: n + 1, sequence: 39 - n, started_at: (39 - n) * 3600 + 1000, ended_at: (39 - n) * 3600 + 1600,
    outcome: 'unprotected', severity_before: 1, severity_after: 2, recovery_progress: 0, resolved_at: 145000 }));
  const response = { node_id: 10, enabled: true, policy: rules, server_time: 145000, grace_until: 3600,
    first_eligible_night: { sequence: 1, started_at: 4600, ended_at: 5200 }, current_or_next_night: { sequence: 40, started_at: 145000, ended_at: 145600 },
    protection_forecast: false, enrollment_pending: false, catching_up: false, processing_available: true,
    health: { severity: 2, onset_at: 5000, processed_until: 142000, recovery_progress: 0, exposure_nights: 40, next_sequence: 40, revision: 1, work_efficiency_bps: 5000, work_penalty_applied: true },
    history: { items: history, _meta: { totalCount: 40, perPage: 30, currentPage: 1, pageCount: 2 } } };
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: response });
  const result = await loadNights(10, 1, '', 30);
  expect(result.history.items).toHaveLength(30); expect(result.health!.work_penalty_applied).toBe(true);
  expect(get.mock.calls[0][1]?.params).toEqual({ page: 1, outcome: '', 'per-page': 30 });
  get.mockResolvedValueOnce({ data: { ...response, history: { ...response.history, items: [...history, history[0]] } } });
  await expect(loadNights(10, 1, '', 30)).rejects.toThrow();
  await expect(loadNights(10, 1, '', 31)).rejects.toThrow();
});

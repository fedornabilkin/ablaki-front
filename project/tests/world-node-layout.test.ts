import { expect, it } from 'vitest';
import { nodeFeatures, tabForHash, tabsForNode } from '../src/entities/world/nodeLayout';
import { isWorldCommandPath, parseWorldCommandResult, parseWorldMap, parseWorldNode } from '../src/services/api/world';
import { nodeTypes, type WorldCapabilities, type WorldNode } from '../src/entities/world/types';

const capabilities: WorldCapabilities = { contract_version: 1, schema_ready: true, world_read: true, world_write: true, storage_v2: true, economy_tick: true };
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
  expect(tabsForNode(room, nodeFeatures(room, capabilities))).toEqual(['map', 'life', 'workshop', 'finance', 'statistics']);
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

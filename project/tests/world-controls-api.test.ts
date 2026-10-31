import { gardenInput, loadGarden } from '../src/services/api/worldGarden';
import { harvestInput, loadHarvest } from '../src/services/api/worldHarvest';
import { occupiesCell } from '../src/entities/world/coordinates';
import { isClosedTestError, parseWorldNode } from '../src/services/api/world';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/services/httpClient';
import { loadStorageContents } from '../src/services/api/worldStorage';
import { parseWorkspace } from '../src/services/api/worldWorkspace';
import { parseMining } from '../src/services/api/worldMining';
import { build, gatherState, startOverview } from '../src/services/api/simpleWorld';
import { loadCharacterOverview, parseProgression } from '../src/services/api/worldCharacter';
import { explorationPredecessors } from '../src/entities/world/mapSelection';

const header = { id: 1, kind: 'backpack', name: 'Рюкзак', node_id: null, container_inventory_id: null, capacity: 100, revision: 3 };
function page(number: number, revision = 3) {
  return { storage: { ...header, revision }, items: [{ id: number, item_id: 1, name: 'Бревно', icon: 'tree', quantity: 5, position: number, revision: 1, instances: [], inner_storage_id: null }],
    slots: [], container: null, location: null, writable: true, server_time: 1, _meta: { totalCount: 2, perPage: 1, currentPage: number, pageCount: 2 } };
}
afterEach(() => vi.restoreAllMocks());
it('loads economy, progression and active work from one validated character response', async () => {
  const data = {contract_version: 1, economy: {enabled: true, server_time: 100, feedback_path: '/forum', health: {hp: 100, max_hp: 100, revision: 0, foods: []}, goals: [], quotas: []},
    character: {progression: {craft: [{name: 'Дерево', level: 2, xp: 150}], professions: []}, construction: {active: null}}};
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({data});
  expect(await loadCharacterOverview()).toMatchObject({economy: {enabled: true}, progression: {craft: [{name: 'Дерево', level: 2, xp: 150}]}, work: null});
  expect(get).toHaveBeenCalledOnce();
  expect(get).toHaveBeenCalledWith(expect.stringMatching(/world\/economy$/), {params: {include: 'character'}});
  get.mockResolvedValue({data: {...data, contract_version: 2}});
  await expect(loadCharacterOverview()).rejects.toThrow('invalid-world-response');
});
it('validates a completed construction receipt and keeps older build responses compatible', () => {
  const project = {id: 1, node_id: 2, owner_user_id: 3, required_seconds: 100, worked_seconds: 100, labor_budget: '10.0000', status: 'completed'};
  const result = {finished_at: 1000, participants: [{user_id: 3, name: 'Владелец', owner: true, seconds: 20, paid_cr: '0.0000'}, {user_id: 4, name: 'Строитель', owner: false, seconds: 80, paid_cr: '8.0000'}], labor_budget_cr: '10.0000', paid_cr: '8.0000', released_cr: '2.0000', object_price_cr: '5.0000', spent_cr: '13.0000', material_refund_percent: 0};
  expect(build({...project, result}).result).toEqual(result); expect(build(project).result).toBeUndefined();
  for (const change of [{paid_cr: '-1'}, {material_refund_percent: 101}, {participants: [...result.participants, result.participants[0]]}, {participants: [{...result.participants[0], owner: 'yes'}]}]) expect(() => build({...project, result: {...result, ...change}})).toThrow();
});
it('parses character progression and rejects malformed experience', () => {
  const value = {craft: [{name: 'Дерево', level: 2, xp: 125}], professions: [{name: 'Исследователь', level: 1, xp: 10}]};
  expect(parseProgression(value)).toEqual(value);
  expect(() => parseProgression({...value, craft: [{...value.craft[0], xp: -1}]})).toThrow();
});
it('requires both predecessors at corners and a nearer predecessor on other outer cells', () => {
  expect(explorationPredecessors({x: 1,y: 1})).toEqual([]);
  expect(explorationPredecessors({x: 2,y: 0})).toEqual([{x: 1,y: 0}]);
  expect(explorationPredecessors({x: -2,y: -2})).toEqual([{x: -1,y: -2}, {x: -2,y: -1}]);
  expect(explorationPredecessors({x: 3,y: 1})).toEqual([{x: 2,y: 1}]);
});
it('validates employer wages and keeps the accepted batch price separate from new terms', () => {
  const row = { node_id: 1, ready: true, working: true, workers: 1, produced_quantity: 0, pending_quantity: 0, seconds_per_unit: 180, server_time: 100,
    employment: { enabled: false, reward_cr: '5.0000', storage_id: 7, owner: false, available: true, reason: null, accepted_reward_cr: '2.0000', storages: [] } };
  expect(parseMining(row).employment).toMatchObject({reward_cr: '5.0000', accepted_reward_cr: '2.0000', owner: false});
  expect(() => parseMining({...row, employment: {...row.employment, reward_cr: 5}})).toThrow();
  expect(() => parseMining({...row, employment: {...row.employment, owner: 'true'}})).toThrow();
});
it('loads starter budget availability before joining a settlement', async () => {
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({data: {node: null, funding: {amount_cr: '250.0000', available: false, message: 'Выберите другое поселение'}, starter_funding: null}});
  expect(await startOverview(4)).toMatchObject({node: null, funding: {available: false, amount_cr: '250.0000'}});
  expect(get.mock.calls[0][1]?.params).toEqual({node_id: 4});
});
it('explains a blocked gathering action and exposes actual quantities for its modal', async () => {
  vi.spyOn(apiClient, 'get').mockResolvedValue({data: {gather_available: true, gather_available_at: 0, server_time: 100, gather_remaining: 4, gather_limit: 5, gather_exhausted: false, gather_can_claim: false, gather_reason: 'Освободите место в рюкзаке.', gather_items: [{name: 'Бревно', quantity: 12}]}});
  expect(await gatherState(2)).toMatchObject({gather_can_claim: false, gather_remaining: 4, gather_items: [{name: 'Бревно', quantity: 12}]});
});
it('accepts region places with different city rates and rejects an invalid place count', async () => {
  const funding = {amount_cr: null, available: true, available_places: 3, message: 'Есть места', settlements: [{node_id: 4, name: 'Город', amount_cr: '100.0000', available_places: 2}, {node_id: 5, name: 'Деревня', amount_cr: '80.0000', available_places: 1}]};
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({data: {node: null, funding, starter_funding: null}});
  expect((await startOverview(2)).funding).toMatchObject(funding);
  get.mockResolvedValue({data: {node: null, funding: {...funding, available_places: -1}, starter_funding: null}});
  await expect(startOverview(2)).rejects.toThrow();
});
it('offers testing access help only for the explicit closed-test denial', () => {
  expect(isClosedTestError({ isAxiosError: true, response: { status: 403, data: { code: 'CLOSED_TEST_ACCESS_REQUIRED' } } })).toBe(true);
  expect(isClosedTestError({ isAxiosError: true, response: { status: 403, data: { code: 'STORAGE_FORBIDDEN' } } })).toBe(false);
  expect(isClosedTestError(new Error('offline'))).toBe(false);
});
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
  expect(harvestInput('withdraw', { inventory_id: 1, quantity: 2, destination_storage_id: 3 })).toEqual({ inventory_id: 1, quantity: 2, destination_storage_id: 3 });
  expect(() => harvestInput('withdraw', { inventory_id: 1, quantity: 2, destination_storage_id: '3' })).toThrow();
  expect(harvestInput('price', { inventory_id: 1, price: '2.5' })).toEqual({ inventory_id: 1, price: '2.5000' });
  expect(harvestInput('price', { inventory_id: 1, price: null })).toEqual({ inventory_id: 1, price: null });
  for (const price of ['-1', '0', '1.00001']) expect(() => harvestInput('price', { inventory_id: 1, price })).toThrow();
  expect(() => harvestInput('buy', { inventory_id: 1, quantity: 1.5 })).toThrow();
  const item = { inventory_id: 1, position: 1, name: 'Crop', icon: 'seedling', quantity: 7, price: '2.5000', harvested_at: 1, fresh_until: 1209601, spoiled: true };
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { node_id: 1, capacity: 5, items: [item], owned_by_me: true, writable: true, server_time: 1209601 } });
  expect((await loadHarvest(1)).items[0].quantity).toBe(7);
  get.mockResolvedValue({ data: { node_id: 1, capacity: 5, slot_limit: 100, items: [item], owned_by_me: false, writable: true, server_time: 1 } });
  expect(await loadHarvest(1)).toMatchObject({capacity: 5, slot_limit: 100});
  for (const slot_limit of [0, 1.5, '100']) {
    get.mockResolvedValue({ data: { node_id: 1, capacity: 5, slot_limit, items: [item], owned_by_me: false, writable: true, server_time: 1 } });
    await expect(loadHarvest(1)).rejects.toThrow();
  }
  get.mockResolvedValue({ data: { node_id: 1, capacity: 5, items: [item, { ...item, inventory_id: 2 }], owned_by_me: true, writable: true, server_time: 1 } });
  await expect(loadHarvest(1)).rejects.toThrow();
});
it('preserves individually opened beds and validates exact selections', async () => {
  expect(gardenInput('expand', { quantity: 2, top_up: true, bed_ids: [20, 12] })).toEqual({ quantity: 2, top_up: true, bed_ids: [12, 20] });
  for (const ids of [[12, 12], [12], ['12', 20]]) expect(() => gardenInput('expand', { quantity: 2, top_up: true, bed_ids: ids })).toThrow();
  const beds = Array.from({ length: 10 }, (_, i) => ({ node_id: 11 + i, ordinal: i + 1, unlocked: [0, 5].includes(i), price: `${i * 10}.0000` }));
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { node_id: 1, cultivation_enabled: true, offer: null, garden: { node_id: 1, unlocked: 2, limit: 10, beds, base_price: '10.0000', available_budget: '0.0000' }, can_buy: false, can_expand: true, can_publish: false, site_budget_available: null, settlement_id: 2, settlement_name: 'Village', server_time: 1 } });
  expect((await loadGarden(1)).garden?.beds[5].unlocked).toBe(true);
});
it('accepts the uniform nullable object settings without hiding the JSON parameters', () => {
  const node = parseWorldNode({ id: 1, type: 'PLOT', parent_id: null, root_id: 1, name: 'Стоянка', status: 'active', visibility: 'private', revision: 1, coordinates: { x: 0, y: 0 }, child_count: 0, permissions: { manage: true, administer: false, storage: true }, actions: [], details: { building_kind: null, climate: null, condition: null, plot_kind: 'campsite', settings_json: '{"custom":1}' } });
  expect(node.details).toMatchObject({ building_kind: null, climate: null, condition: null, plot_kind: 'campsite', settings_json: '{"custom":1}' });
});
it('treats footprint cells as occupied even away from the object anchor', () => {
  const node = { coordinates: { x: 0, y: 0 }, footprint: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }] };
  expect(occupiesCell(node, { x: 1, y: 1 })).toBe(true);
  expect(occupiesCell(node, { x: 2, y: 1 })).toBe(false);
});

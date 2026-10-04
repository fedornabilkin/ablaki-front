import { isAxiosError } from 'axios';
import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { creditAmount } from '@/entities/world/credits';
import type { WorldCapabilities, WorldScreen } from '@/entities/world/types';
import { nodeTypes, type NodeType, type WorldNode, type WorldPage, type WorldMapData, type WorldRoot, type WorldNavigation, type WorldQuote, type WorldCommandResult, type WorldOnboarding } from '@/entities/world/types';

const invalid = (): never => { throw new Error('invalid-world-response'); };
export const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : invalid();
export const integer = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max ? value : invalid();
const text = (value: unknown, max = 255): string => typeof value === 'string' && value.length <= max ? value : invalid();
const boolean = (value: unknown): boolean => typeof value === 'boolean' ? value : invalid();
const nullableId = (value: unknown) => value === null ? null : integer(value, 1);
const list = <T>(value: unknown, parse: (value: unknown) => T, max = 100): T[] => Array.isArray(value) && value.length <= max ? value.map(parse) : invalid();
const hexId = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value) ? value : invalid();
function parseMapBounds(value: unknown) { const b = record(value); return { x: integer(b.x, -1000000, 1000000), y: integer(b.y, -1000000, 1000000), width: integer(b.width, 1, 2000001), height: integer(b.height, 1, 2000001) }; }
export function parseWorldNode(value: unknown): WorldNode {
  const row = record(value), coordinates = record(row.coordinates), permissions = record(row.permissions);
  if (!nodeTypes.includes(row.type as NodeType) || !['public', 'private'].includes(String(row.visibility))) invalid();
  const details: WorldNode['details'] = {};
  for (const [key, entry] of Object.entries(record(row.details))) {
    if (['building_kind', 'climate', 'settlement_kind', 'plot_kind', 'exposure_class', 'operational_status'].includes(key)) details[key] = text(entry, 40);
    else if (['harvested_quantity', 'template_revision_id', 'population', 'plot_limit', 'level', 'condition', 'max_condition', 'active_project_id', 'shelter_instance_id', 'shelter_plot_id', 'area', 'fertility', 'allow_building', 'garden_node_id', 'ordinal', 'unlocked'].includes(key)) details[key] = entry === null ? null : integer(entry);
  }
  return { ...(row.map === undefined ? {} : { map: parseMapBounds(row.map) }), ...(row.has_finances === undefined ? {} : { has_finances: boolean(row.has_finances) }), id: integer(row.id, 1), type: row.type as NodeType, parent_id: nullableId(row.parent_id), root_id: integer(row.root_id, 1),
    code: text(row.code ?? `node-${row.id}`, 80), name: text(row.name, 120), label: text(row.label ?? row.name, 120), status: text(row.status, 24), visibility: row.visibility as WorldNode['visibility'], revision: integer(row.revision, 1), portable: row.portable === undefined ? false : boolean(row.portable),
    coordinates: { x: integer(coordinates.x, -1000000, 1000000), y: integer(coordinates.y, -1000000, 1000000) },
    footprint: row.footprint === null || row.footprint === undefined ? null : list(row.footprint, point => {
      const vertex = record(point);
      return { x: integer(vertex.x, -1000000, 1000000), y: integer(vertex.y, -1000000, 1000000) };
    }, 32), child_count: integer(row.child_count), descendant_count: row.descendant_count === undefined ? integer(row.child_count) : integer(row.descendant_count),
    population_total: row.population_total === undefined ? integer(typeof details.population === 'number' ? details.population : 0) : integer(row.population_total),
    owned_by_me: row.owned_by_me === undefined ? boolean(permissions.storage ?? false) : boolean(row.owned_by_me), details,
    permissions: { manage: boolean(permissions.manage), administer: boolean(permissions.administer), storage: permissions.storage === undefined ? false : boolean(permissions.storage) },
    actions: list(row.actions, value => { const action = record(value); return { code: text(action.code, 80), allowed: boolean(action.allowed), reasons: list(action.reasons, value => { const reason = record(value); return { code: text(reason.code, 80), ...(reason.message === undefined ? {} : { message: text(reason.message) }) }; }) }; }) };
}
export function parseWorldPage(value: unknown): WorldPage {
  const row = record(value), meta = record(row._meta), items = list(row.items, parseWorldNode);
  const total = integer(meta.totalCount), pageSize = integer(meta.perPage, 1, 100), currentPage = integer(meta.currentPage, 1, 1000000), pageCount = integer(meta.pageCount);
  if (pageCount !== Math.ceil(total / pageSize) || items.length > pageSize || items.length > total) invalid();
  return { items, total, pageSize, currentPage, pageCount };
}
export function parseWorldRoot(value: unknown): WorldRoot {
  const row = record(value);
  if (row.contract_version !== 1) invalid();
  return { home_node_id: row.home_node_id === undefined ? null : nullableId(row.home_node_id), contract_version: 1, server_time: integer(row.server_time), world: row.world === null ? null : parseWorldNode(row.world), regions: parseWorldPage(row.regions),
    capabilities: parseCapabilities(row.capabilities) };
}
function parseCapabilities(value: unknown): WorldCapabilities {
  const flags = record(value);
  if (flags.contract_version !== 1) invalid();
  return { contract_version: 1, schema_ready: boolean(flags.schema_ready), world_read: boolean(flags.world_read), world_write: boolean(flags.world_write), storage_v2: boolean(flags.storage_v2), economy_tick: boolean(flags.economy_tick) };
}
export function parseWorldScreen(value: unknown, requestedId: number | null): WorldScreen {
  const row = record(value);
  if (row.contract_version !== 1) invalid();
  const capabilities = parseCapabilities(row.capabilities);
  const navigation = row.navigation === null ? null : parseWorldNavigation(row.navigation);
  const map = row.map === null ? null : parseWorldMap(row.map, navigation?.node.id ?? invalid());
  if ((navigation === null) !== (map === null) || (map && !('node_id' in map)) || (!capabilities.world_read && navigation)) invalid();
  if (navigation && requestedId !== null && navigation.node.id !== integer(requestedId, 1)) invalid();
  return { contract_version: 1, server_time: integer(row.server_time), capabilities, navigation, map: map as WorldScreen['map'] };
}
export function parseWorldNavigation(value: unknown): WorldNavigation {
  const row = record(value);
  return { node: parseWorldNode(row.node), parent_id: nullableId(row.parent_id), breadcrumbs: list(row.breadcrumbs, parseWorldNode, 33), siblings: parseWorldPage(row.siblings) };
}
export function parseRevisions(value: unknown): Record<string, number> {
  const result: Record<string, number> = {}, row = record(value);
  if (Object.keys(row).length > 256) invalid();
  for (const [key, entry] of Object.entries(row)) {
    if (!/^((node|storage|inventory|instance|account):[1-9]\d*|catalog|registry)$/.test(key)) invalid();
    result[key] = integer(entry, 1);
  }
  return result;
}
export function parseWorldQuote(value: unknown): WorldQuote {
  const row = record(value);
  return { quote_id: hexId(row.quote_id), expires_at: integer(row.expires_at), expected_revisions: parseRevisions(row.expected_revisions), terms: record(row.terms), server_time: integer(row.server_time) };
}
export function parseWorldCommandResult(value: unknown): WorldCommandResult {
  const row = record(value);
  if (row.contract_version !== 1 || typeof row.request_key !== 'string' || !/^[A-Za-z0-9_-]{16,80}$/.test(row.request_key)) invalid();
  const money: Pick<WorldCommandResult, 'amount' | 'wallet_after' | 'currency'> = {};
  if (row.amount !== undefined || row.wallet_after !== undefined || row.currency !== undefined) {
    if (row.currency !== 'Cr') invalid();
    if (row.amount !== undefined) money.amount = creditAmount(row.amount);
    if (row.wallet_after !== undefined) money.wallet_after = creditAmount(row.wallet_after);
    money.currency = 'Cr';
  }
  const premises: Pick<WorldCommandResult, 'building_id' | 'room_id' | 'project_id' | 'finish_at'> = {};
  if (row.project_id !== undefined || row.finish_at !== undefined) {
    if (row.room_id !== undefined) invalid();
    premises.building_id = integer(row.building_id, 1, 2147483647); premises.project_id = integer(row.project_id, 1, 2147483647); premises.finish_at = integer(row.finish_at);
  } else if (row.building_id !== undefined || row.room_id !== undefined) {
    premises.building_id = integer(row.building_id, 1, 2147483647); premises.room_id = integer(row.room_id, 1, 2147483647);
  }
  return { ...money, ...premises, ...(row.return_node_id === undefined ? {} : { return_node_id: integer(row.return_node_id, 1, 2147483647) }), contract_version: 1, operation_id: hexId(row.operation_id), request_key: row.request_key, server_time: integer(row.server_time),
    changed_node_ids: list(row.changed_node_ids, value => integer(value, 1), 10000), ...(row.changed_storage_ids === undefined ? {} : { changed_storage_ids: list(row.changed_storage_ids, value => integer(value, 1), 10000) }), ...(row.node === undefined ? {} : { node: parseWorldNode(row.node) }) };
}
const url = (path: string) => config.makeApiUrl(`v1/world${path}`);
export async function loadWorldScreen(id: number | null): Promise<WorldScreen> {
  const path = id === null ? '' : `/nodes/${integer(id, 1)}/navigation`;
  const params = id === null ? { view: 'home' } : { include: 'map' };
  return parseWorldScreen((await apiClient.get(url(path), { params })).data, id);
}
export async function loadWorld(params: Record<string, unknown> = {}) { return parseWorldRoot((await apiClient.get(url(''), { params: { ...params, envelope: 1 } })).data); }
export async function loadWorldNavigation(id: number) { return parseWorldNavigation((await apiClient.get(url(`/nodes/${integer(id, 1)}/navigation`))).data); }
export async function loadWorldChildren(id: number, params: Record<string, unknown>) { return parseWorldPage((await apiClient.get(url(`/nodes/${integer(id, 1)}/children`), { params: { ...params, envelope: 1 } })).data); }
export function parseWorldMap(value: unknown, id: number): WorldMapData | WorldPage {
  const row = record(value), nodeId = integer(id, 1);
  // Older servers return the paginated children contract from /map.
  if ('_meta' in row) return parseWorldPage(row);
  if (integer(row.node_id, 1) !== nodeId) invalid();
  const exploration = row.exploration === undefined ? undefined : (() => { const e = record(row.exploration); return { allowed: boolean(e.allowed), level: integer(e.level, 0, 100), max_level_per_node: integer(e.max_level_per_node, 3, 3), elixir_quantity: integer(e.elixir_quantity), reason: String(e.reason ?? '') }; })();
  const pricing = row.pricing === undefined ? undefined : (() => { const p = record(row.pricing); if (p.currency !== 'Cr') invalid(); return { paid_cells: integer(p.paid_cells), base_price: creditAmount(p.base_price), next_price: creditAmount(p.next_price), bulk_minimum: integer(p.bulk_minimum, 1, 100), discount_bps: integer(p.discount_bps, 0, 10000), max_quantity: integer(p.max_quantity, 1, 100), currency: 'Cr' as const }; })();
  return { exploration, pricing, ...(row.bounds === undefined ? {} : { bounds: parseMapBounds(row.bounds) }), node_id: nodeId, items: list(row.items, parseWorldNode, Number.MAX_SAFE_INTEGER), can_expand: boolean(row.can_expand),
    cells: list(row.cells, value => { const cell = record(value); if (!['discovered', 'open'].includes(String(cell.state))) invalid();
      return { x: integer(cell.x, -1000000, 1000000), y: integer(cell.y, -1000000, 1000000), state: cell.state as 'discovered' | 'open' }; }, Number.MAX_SAFE_INTEGER) };
}
export async function loadWorldMap(id: number): Promise<WorldMapData> {
  const nodeId = integer(id, 1);
  const mapped = parseWorldMap((await apiClient.get(url(`/nodes/${nodeId}/map`))).data, nodeId);
  if ('node_id' in mapped) return mapped;
  const items = [...mapped.items];
  for (let page = 2; page <= mapped.pageCount; page++) {
    const next = await loadWorldChildren(nodeId, { page, 'per-page': mapped.pageSize });
    if (next.currentPage !== page || next.total !== mapped.total) invalid();
    items.push(...next.items);
  }
  if (items.length !== mapped.total) invalid();
  return { node_id: nodeId, items, cells: [], can_expand: false };
}
export async function loadExplorer() {
  const data = record((await apiClient.get(url('/professions'), { params: { q: 'explorer' } })).data);
  const rows = list(data.items, record, 20), p = rows.find(p => p.code === 'explorer');
  if (!p) return null;
  const next = p.next_level === null ? null : record(p.next_level);
  return { id: integer(p.id, 1), enrolled: boolean(p.enrolled), level: integer(p.level, 1), xp: integer(p.xp), next: next ? { level: integer(next.level, 1), required_xp: integer(next.required_xp), available: boolean(next.available) } : null };
}
export async function previewProfession(id: number, action: 'enroll' | 'level-up') { return parseWorldQuote((await apiClient.post(url(`/professions/${integer(id, 1)}/${action}-preview`), {})).data); }
export interface MapCellInput { cells: { x: number; y: number }[]; top_up: boolean; use_elixir: boolean }
export async function previewMapCells(id: number, action: 'explore' | 'buy', input: MapCellInput): Promise<WorldQuote> {
  return parseWorldQuote((await apiClient.post(url(`/nodes/${integer(id, 1)}/map-${action}-preview`), input)).data);
}
/** @deprecated Use previewMapCells, including for a single cell. */
export async function previewMapCell(id: number, action: 'explore' | 'buy', x: number, y: number, topUp: boolean): Promise<WorldQuote> {
  return parseWorldQuote((await apiClient.post(url(`/nodes/${integer(id, 1)}/map-${action}-preview`), { x: integer(x, -1000000, 1000000), y: integer(y, -1000000, 1000000), top_up: boolean(topUp) })).data);
}
export async function loadWorldStatistics(id: number): Promise<{ type: NodeType; count: number }[]> {
  const row = record((await apiClient.get(url(`/nodes/${integer(id, 1)}/statistics`))).data);
  return list(row.items, value => {
    const item = record(value);
    if (!nodeTypes.includes(item.type as NodeType)) invalid();
    return { type: item.type as NodeType, count: integer(item.count) };
  }, nodeTypes.length);
}
export type ManagementAction = 'move' | 'archive';
export async function previewWorldManagement(id: number, action: ManagementAction, payload: Record<string, unknown>) { return parseWorldQuote((await apiClient.post(url(`/nodes/${integer(id, 1)}/${action}-preview`), payload)).data); }
export async function sendWorldCommand(path: string, body: Record<string, unknown>) {
  if (!isWorldCommandPath(path)) invalid();
  return parseWorldCommandResult((await apiClient.post(url(path), body)).data);
}
export const isWorldCommandPath = (path: string): boolean => /^\/professions\/[1-9]\d*\/(enroll|level-up)$/.test(path) || /^\/beds\/[1-9]\d*\/(dig|sow|water|harvest|cancel)$/.test(path) || path === '/onboarding/join' || path === '/workspace/craft' || path === '/storage/recover' || path === '/storage/transfer' || path === '/storage/chest-repair' || /^\/nodes\/[1-9]\d*\/(move|archive|invest|budget-grant|supplies-starter|supplies-gather|collect|pay|finance-policy|order-publish|order-deliver|order-cancel|premises-publish|premises-buy|premises-withdraw|shelter-claim|shelter-deploy|shelter-fold|shelter-lodge|shelter-leave|shelter-repair|harvest-price|harvest-buy|harvest-withdraw|garden-publish|garden-withdraw|garden-buy|garden-expand|map-explore|map-buy|warehouse-expand|equipment-expand|housing-lodge|housing-leave|construction-pause|construction-resume|construction-cancel|building-pause|building-resume|building-repair|repair-contract|demolish)$/.test(path);
export async function loadWorldOnboarding(): Promise<WorldOnboarding> {
  const row = record((await apiClient.get(url('/onboarding'))).data);
  return { world_id: integer(row.world_id, 1), joined: boolean(row.joined), starter_site_id: nullableId(row.starter_site_id), joined_at: nullableId(row.joined_at), grace_until: nullableId(row.grace_until), server_time: integer(row.server_time), join_available: boolean(row.join_available) };
}
export async function previewWorldJoin(settlement: number) { return parseWorldQuote((await apiClient.post(url('/onboarding/preview'), { settlement_id: integer(settlement, 1) })).data); }
export function worldError(cause: unknown): string {
  if (isAxiosError(cause)) {
    const data = cause.response?.data;
    if (data && typeof data === 'object' && typeof data.message === 'string' && typeof data.code === 'string') return data.message;
    if (!cause.response) return 'Не удалось связаться с миром. Повторите запрос.';
    if (cause.response.status === 401) return 'Войдите в аккаунт заново.';
    if (cause.response.status === 403) return 'Нет доступа к этому объекту.';
    if (cause.response.status === 404) return 'Объект не найден или недоступен.';
  }
  return 'Не удалось загрузить мир. Попробуйте ещё раз.';
}

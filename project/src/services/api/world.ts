import { isAxiosError } from 'axios';
import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { creditAmount } from '@/entities/world/credits';
import { nodeTypes, type NodeType, type WorldNode, type WorldPage, type WorldRoot, type WorldNavigation, type WorldQuote, type WorldCommandResult, type WorldOnboarding } from '@/entities/world/types';

const invalid = (): never => { throw new Error('invalid-world-response'); };
export const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : invalid();
export const integer = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max ? value : invalid();
const text = (value: unknown, max = 255): string => typeof value === 'string' && value.length <= max ? value : invalid();
const boolean = (value: unknown): boolean => typeof value === 'boolean' ? value : invalid();
const nullableId = (value: unknown) => value === null ? null : integer(value, 1);
const list = <T>(value: unknown, parse: (value: unknown) => T, max = 100): T[] => Array.isArray(value) && value.length <= max ? value.map(parse) : invalid();
const hexId = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value) ? value : invalid();
export function parseWorldNode(value: unknown): WorldNode {
  const row = record(value), coordinates = record(row.coordinates), permissions = record(row.permissions);
  if (!nodeTypes.includes(row.type as NodeType) || !['public', 'private'].includes(String(row.visibility))) invalid();
  const details: WorldNode['details'] = {};
  for (const [key, entry] of Object.entries(record(row.details))) {
    if (['climate', 'settlement_kind', 'plot_kind', 'exposure_class', 'operational_status'].includes(key)) details[key] = text(entry, 40);
    else if (['template_revision_id', 'population', 'plot_limit', 'level', 'condition', 'max_condition', 'active_project_id', 'area', 'fertility', 'allow_building', 'garden_node_id', 'ordinal', 'unlocked'].includes(key)) details[key] = entry === null ? null : integer(entry);
  }
  return { id: integer(row.id, 1), type: row.type as NodeType, parent_id: nullableId(row.parent_id), root_id: integer(row.root_id, 1),
    name: text(row.name, 120), status: text(row.status, 24), visibility: row.visibility as WorldNode['visibility'], revision: integer(row.revision, 1),
    coordinates: { x: integer(coordinates.x, -1000000, 1000000), y: integer(coordinates.y, -1000000, 1000000) }, child_count: integer(row.child_count), details,
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
  const row = record(value), flags = record(row.capabilities);
  if (row.contract_version !== 1 || flags.contract_version !== 1) invalid();
  return { contract_version: 1, server_time: integer(row.server_time), world: row.world === null ? null : parseWorldNode(row.world), regions: parseWorldPage(row.regions),
    capabilities: { contract_version: 1, schema_ready: boolean(flags.schema_ready), world_read: boolean(flags.world_read), world_write: boolean(flags.world_write), storage_v2: boolean(flags.storage_v2), economy_tick: boolean(flags.economy_tick) } };
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
    money.amount = creditAmount(row.amount); money.wallet_after = creditAmount(row.wallet_after); money.currency = 'Cr';
  }
  return { ...money, contract_version: 1, operation_id: hexId(row.operation_id), request_key: row.request_key, server_time: integer(row.server_time),
    changed_node_ids: list(row.changed_node_ids, value => integer(value, 1), 10000), ...(row.changed_storage_ids === undefined ? {} : { changed_storage_ids: list(row.changed_storage_ids, value => integer(value, 1), 10000) }), ...(row.node === undefined ? {} : { node: parseWorldNode(row.node) }) };
}
const url = (path: string) => config.makeApiUrl(`v1/world${path}`);
export async function loadWorld(params: Record<string, unknown> = {}) { return parseWorldRoot((await apiClient.get(url(''), { params: { ...params, envelope: 1 } })).data); }
export async function loadWorldNavigation(id: number) { return parseWorldNavigation((await apiClient.get(url(`/nodes/${integer(id, 1)}/navigation`))).data); }
export async function loadWorldChildren(id: number, params: Record<string, unknown>) { return parseWorldPage((await apiClient.get(url(`/nodes/${integer(id, 1)}/children`), { params: { ...params, envelope: 1 } })).data); }
export type ManagementAction = 'move' | 'archive';
export async function previewWorldManagement(id: number, action: ManagementAction, payload: Record<string, unknown>) { return parseWorldQuote((await apiClient.post(url(`/nodes/${integer(id, 1)}/${action}-preview`), payload)).data); }
export async function sendWorldCommand(path: string, body: Record<string, unknown>) {
  if (!isWorldCommandPath(path)) invalid();
  return parseWorldCommandResult((await apiClient.post(url(path), body)).data);
}
export const isWorldCommandPath = (path: string): boolean => path === '/onboarding/join' || path === '/workspace/craft' || path === '/storage/recover' || path === '/storage/transfer' || path === '/storage/chest-repair' || /^\/nodes\/[1-9]\d*\/(move|archive|invest|collect|pay|finance-policy|order-publish|order-deliver|order-cancel)$/.test(path);
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

import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';

export type BuildingAction = 'pause' | 'resume';
export const buildingStatuses = { planned: 'Запланирована', constructing: 'Строится', active: 'Работает', paused: 'Приостановлена', damaged: 'Повреждена', destroyed: 'Разрушена', archived: 'В архиве' } as const;
const invalid = (): never => { throw new Error('invalid-building-operation-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const text = (value: unknown): string => typeof value === 'string' && value.trim().length > 0 && value.length <= 2000 ? value : invalid();
const url = (node: number, action = 'building-operation') => config.makeApiUrl(`v1/world/nodes/${id(node)}/${action}`);
export async function loadBuildingOperation(node: number) {
  const row = record((await apiClient.get(url(node))).data);
  if (id(row.node_id) !== node || typeof row.writable !== 'boolean' || typeof row.operational_status !== 'string' || !Object.prototype.hasOwnProperty.call(buildingStatuses, row.operational_status)) return invalid();
  if (!Array.isArray(row.reasons) || row.reasons.length > 16 || ![null, 'pause', 'resume'].includes(row.action as null | string)) return invalid();
  const reasons = row.reasons.map(text), status = row.operational_status as keyof typeof buildingStatuses;
  const action = row.action as BuildingAction | null;
  if ((action === null) !== (reasons.length > 0) || (action === 'pause' && status !== 'active') || (action === 'resume' && status !== 'paused')) return invalid();
  const maximum = integer(row.max_condition, 1, 2147483647);
  integer(row.server_time);
  return { node, name: text(row.name), status, action, reasons, writable: row.writable,
    condition: integer(row.condition, 0, maximum), maxCondition: maximum,
    roomCount: integer(row.room_count, 0, 101), lodgingCount: integer(row.lodging_count, 0, 101) };
}
export async function previewBuildingOperation(node: number, action: BuildingAction) {
  const quote = parseWorldQuote((await apiClient.post(url(node, `building-${action}-preview`), {})).data), terms = quote.terms;
  if (id(terms.node_id) !== node || terms.action !== action || terms.price !== '0.0000' || terms.from !== (action === 'pause' ? 'active' : 'paused') || terms.to !== (action === 'pause' ? 'paused' : 'active')) invalid();
  if (!Array.isArray(terms.room_ids) || terms.room_ids.length > 100 || !Array.isArray(terms.closed_lodgings) || terms.closed_lodgings.length > 100) return invalid();
  const rooms = terms.room_ids.map(id), seen = new Set<number>();
  if (new Set(rooms).size !== rooms.length || rooms.includes(node)) invalid();
  for (const value of terms.closed_lodgings) {
    const row = record(value), lodging = id(row.id);
    if (seen.has(lodging) || !rooms.includes(id(row.room_id))) invalid();
    seen.add(lodging); id(row.actor_id); integer(row.started_at);
  }
  if (action === 'resume' && seen.size) invalid();
  integer(terms.condition, 1, 2147483647);
  return { node, action, quote, name: text(terms.name), lodgingCount: seen.size, roomCount: rooms.length };
}

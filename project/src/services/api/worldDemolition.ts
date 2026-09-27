import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';
const invalid = (): never => { throw new Error('invalid-demolition-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const text = (value: unknown): string => typeof value === 'string' && value.trim().length > 0 && value.length <= 2000 ? value : invalid();
const bool = (value: unknown): boolean => typeof value === 'boolean' ? value : invalid();
const url = (node: number, action = 'demolition') => config.makeApiUrl(`v1/world/nodes/${id(node)}/${action}`);
function ids(value: unknown, max: number): number[] {
  if (!Array.isArray(value) || value.length > max) return invalid();
  const result = value.map(id);
  if (new Set(result).size !== result.length) invalid();
  return result;
}
export async function loadDemolition(node: number) {
  const row = record((await apiClient.get(url(node))).data);
  if (id(row.node_id) !== node || row.price !== '0.0000' || row.refund !== '0.0000' || !Array.isArray(row.reasons) || row.reasons.length > 32) return invalid();
  const reasons = row.reasons.map(value => { const r = record(value); return { code: text(r.code), message: text(r.message) }; });
  const available = bool(row.available), area = integer(row.area, 0, 4), plot = row.plot_id === null ? null : id(row.plot_id);
  if (available !== !reasons.length || (available && (!area || !plot))) invalid();
  integer(row.server_time);
  return { node, name: text(row.name), available, reasons, area, plot, writable: bool(row.writable) };
}
export async function previewDemolition(node: number) {
  const quote = parseWorldQuote((await apiClient.post(url(node, 'demolish-preview'), {})).data), terms = quote.terms;
  if (id(terms.node_id) !== node || terms.price !== '0.0000' || terms.refund !== '0.0000' || !Array.isArray(terms.salvage) || terms.salvage.length || !['active', 'paused', 'damaged', 'destroyed'].includes(terms.status_before as string)) invalid();
  const rooms = ids(terms.room_ids, 1), storages = ids(terms.storage_ids, 100);
  if (rooms.length !== 1 || rooms.includes(node)) invalid();
  ids(terms.account_ids, 200); id(terms.purchase_id); integer(terms.condition, 0, 1000000);
  return { node, quote, name: text(terms.name), plot: id(terms.plot_id), area: integer(terms.area, 1, 4), rooms, storages };
}
export async function loadDemolitions(node: number, params: Record<string, unknown>) {
  const row = record((await apiClient.get(url(node, 'demolitions'), { params })).data), meta = record(row._meta);
  if (id(row.node_id) !== node || !Array.isArray(row.items) || row.items.length > 20) return invalid();
  const items = row.items.map(value => {
    const r = record(value);
    if (r.refund !== '0.0000') invalid();
    return { id: id(r.id), building_id: id(r.building_id), name: text(r.name), area: integer(r.area, 1, 4), created_at: integer(r.created_at) };
  });
  const total = integer(meta.totalCount), pageSize = integer(meta.perPage, 20, 20);
  if (integer(meta.pageCount) !== Math.ceil(total / pageSize) || items.length > total || items.some((item, i) => i > 0 && item.id >= items[i - 1].id)) invalid();
  return { items, total, pageSize, currentPage: integer(meta.currentPage, 1, 1000000) };
}

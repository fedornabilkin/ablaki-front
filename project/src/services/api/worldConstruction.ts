import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';
import { creditAmount } from '@/entities/world/credits';
const invalid = (): never => { throw new Error('invalid-construction-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const text = (value: unknown): string => typeof value === 'string' && value.trim().length > 0 && value.length <= 120 ? value : invalid();
const url = (node: number, action = 'construction') => config.makeApiUrl(`v1/world/nodes/${id(node)}/${action}`);
export function parseConstructionMaterials(value: unknown) {
  if (!Array.isArray(value) || value.length > 8) return invalid();
  const items = value.map(entry => { const row = record(entry); return { item_id: id(row.item_id), name: text(row.name), quantity: integer(row.quantity, 1, 10000) }; });
  if (new Set(items.map(item => item.item_id)).size !== items.length) invalid();
  return items;
}
export function parseConstructionSpec(value: unknown) {
  const row = record(value), delivery = row.delivery ?? 'ready';
  if (delivery !== 'ready' && delivery !== 'construction') return invalid();
  const duration_seconds = integer(row.duration_seconds ?? 0, delivery === 'ready' ? 0 : 60, delivery === 'ready' ? 0 : 604800);
  const materials = parseConstructionMaterials(row.materials ?? []);
  if ((delivery === 'ready' && materials.length !== 0) || (delivery === 'construction' && (!materials.length || row.cancellation !== 'full_refund_before_completion'))) invalid();
  return { delivery, duration_seconds, materials };
}
export function validateConstructionPlan(value: unknown, materials: ReturnType<typeof parseConstructionMaterials>): void {
  if (!Array.isArray(value) || value.length < 1 || value.length > 64) invalid();
  const amounts = new Map<number, number>(), inventories = new Set<number>(), storages = new Set<number>();
  for (const entry of value as unknown[]) {
    const row = record(entry), inventory = id(row.inventory_id), item = id(row.item_id);
    if (inventories.has(inventory)) invalid();
    inventories.add(inventory); storages.add(id(row.storage_id));
    amounts.set(item, (amounts.get(item) ?? 0) + integer(row.quantity, 1, 10000));
  }
  if (storages.size !== 1 || amounts.size !== materials.length || materials.some(item => amounts.get(item.item_id) !== item.quantity)) invalid();
}
export type ConstructionAction = 'pause' | 'resume' | 'cancel';
export const constructionStatus = { constructing: 'Строится', paused: 'На паузе', completed: 'Завершено', cancelled: 'Отменено' } as const;
export async function loadConstruction(node: number, params: Record<string, unknown>) {
  const row = record((await apiClient.get(url(node), { params })).data), meta = record(row._meta);
  if (id(row.node_id) !== node || typeof row.writable !== 'boolean' || !Array.isArray(row.items) || row.items.length > 20) return invalid();
  const items = row.items.map(value => {
    const r = record(value);
    if (typeof r.status !== 'string' || !Object.prototype.hasOwnProperty.call(constructionStatus, r.status)) return invalid();
    const status = r.status as keyof typeof constructionStatus;
    const result = { id: id(r.id), node_id: id(r.node_id), plot_id: id(r.plot_id), name: text(r.name), status, revision: id(r.revision),
      started_at: integer(r.started_at), finish_at: integer(r.finish_at), remaining_seconds: integer(r.remaining_seconds, 0, 604800),
      room_id: r.room_id === null ? null : id(r.room_id), price: creditAmount(r.price), materials: parseConstructionMaterials(r.materials) };
    if ((result.node_id !== node && result.plot_id !== node) || (status === 'completed') !== (result.room_id !== null) || result.finish_at < result.started_at || !result.materials.length) invalid();
    return result;
  });
  const total = integer(meta.totalCount), pageSize = integer(meta.perPage, 20, 20);
  if (integer(meta.pageCount) !== Math.ceil(total / pageSize) || items.length > total || items.some((item, index) => index > 0 && item.id >= items[index - 1].id)) invalid();
  return { items, total, pageSize, currentPage: integer(meta.currentPage, 1, 1000000), writable: row.writable, server_time: integer(row.server_time) };
}
export async function previewConstruction(node: number, action: ConstructionAction) {
  const quote = parseWorldQuote((await apiClient.post(url(node, `construction-${action}-preview`), {})).data), terms = quote.terms;
  if (id(terms.node_id) !== node || terms.action !== action || terms.cancellation !== 'full_refund_before_completion') invalid();
  id(terms.project_id); id(terms.project_revision); integer(terms.finish_at);
  return { node, action, quote, name: text(terms.name), price: creditAmount(terms.price), materials: parseConstructionMaterials(terms.materials) };
}

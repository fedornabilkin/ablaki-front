import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';
import { creditAmount, investmentAmount } from '@/entities/world/credits';
const invalid = (): never => { throw new Error('invalid-order-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const text = (value: unknown, max = 255): string => typeof value === 'string' && value.length <= max ? value : invalid();
const bool = (value: unknown): boolean => typeof value === 'boolean' ? value : invalid();
const url = (node: number, action: string) => config.makeApiUrl(`v1/world/nodes/${id(node)}/${action}`);
function page<T extends { id: number }>(value: unknown, parse: (value: unknown) => T) {
  const r = record(value), meta = record(r._meta);
  if (!Array.isArray(r.items) || r.items.length > 20) invalid();
  const items = (r.items as unknown[]).map(parse), total = integer(meta.totalCount), pageSize = integer(meta.perPage, 20, 20), currentPage = integer(meta.currentPage, 1, 1000000);
  if (integer(meta.pageCount) !== Math.ceil(total / pageSize) || items.length > total || new Set(items.map(item => item.id)).size !== items.length) invalid();
  return { items, total, pageSize, currentPage };
}
export async function loadOrders(node: number, params: Record<string, unknown>) {
  const r = record((await apiClient.get(url(node, 'orders'), { params })).data);
  if (id(r.node_id) !== node) invalid();
  const list = page(r, value => {
    const row = record(value);
    if (!['open', 'fulfilled', 'cancelled', 'expired'].includes(String(row.status))) invalid();
    const quantity = integer(row.quantity, 1, 1000000);
    return { id: id(row.id), item_id: id(row.item_id), item_name: text(row.item_name, 120), quantity, remaining_quantity: integer(row.remaining_quantity, 0, quantity),
      my_remaining: integer(row.my_remaining, 0, quantity), unit_price: creditAmount(row.unit_price), purpose: text(row.purpose), status: text(row.status, 16), can_cancel: bool(row.can_cancel), expires_at: integer(row.expires_at) };
  });
  const site = r.site_node_id === null ? null : id(r.site_node_id), canDeliver = bool(r.can_deliver);
  if (canDeliver && site === null) invalid();
  return { ...list, site_node_id: site, can_deliver: canDeliver, can_publish: bool(r.can_publish), server_time: integer(r.server_time) };
}
export type StarterOrder = Awaited<ReturnType<typeof loadOrders>>['items'][number];
export async function loadOrderItems(node: number, params: Record<string, unknown>) {
  return page((await apiClient.get(url(node, 'order-items'), { params })).data, value => { const row = record(value); return { id: id(row.id), name: text(row.name, 120) }; });
}
export async function loadOrderStock(node: number, item: number, currentPage: number) {
  const r = record((await apiClient.get(url(node, 'order-stock'), { params: { item_id: id(item), page: integer(currentPage, 1, 1000000) } })).data);
  if (id(r.item_id) !== item) invalid();
  return page(r, value => { const row = record(value); return { id: id(row.id), quantity: integer(row.quantity, 1, 2147483647), position: id(row.position) }; });
}
function policy(value: unknown) {
  const r = record(value), loss = record(r.loss_policy);
  return { rate_bps: integer(r.rate_bps, 0, 10000), due_seconds: integer(r.due_seconds, 3600, 31536000),
    protected_seconds: integer(loss.protected_seconds, 0, 31536000), loss_period_seconds: integer(loss.loss_period_seconds, 3600, 2592000), loss_rate_bps: integer(loss.loss_rate_bps, 0, 10000) };
}
export function orderPublicationInput(value: unknown) {
  const r = record(value), quantity = integer(r.quantity, 1, 1000000), purpose = text(r.purpose).trim();
  if (!purpose || r.initialize_starter_policy !== true) invalid();
  return { item_id: id(r.item_id), quantity, per_user_limit: integer(r.per_user_limit, 1, quantity), lifetime_hours: integer(r.lifetime_hours, 1, 720),
    unit_price: investmentAmount(r.unit_price), purpose, initialize_starter_policy: true as const };
}
export function orderDeliveryInput(value: unknown) {
  const r = record(value); return { order_id: id(r.order_id), inventory_id: id(r.inventory_id), quantity: integer(r.quantity, 1, 10000) };
}
async function preview(node: number, action: string, input: Record<string, unknown>) {
  const quote = parseWorldQuote((await apiClient.post(url(node, `order-${action}-preview`), input)).data);
  if (id(quote.terms.node_id) !== node) invalid();
  for (const [key, value] of Object.entries(input)) if (quote.terms[key] !== value) invalid();
  return quote;
}
export async function previewOrderPublication(node: number, payload: unknown) {
  const input = orderPublicationInput(payload), quote = await preview(node, 'publish', input), terms = quote.terms;
  if (terms.goods_consumed !== true) invalid();
  return { quote, input, cost: creditAmount(terms.reserved_cost), item_name: text(terms.item_name, 120), policy: policy(terms.starter_policy) };
}
export async function previewOrderDelivery(node: number, payload: unknown) {
  const input = orderDeliveryInput(payload), quote = await preview(node, 'deliver', input), terms = quote.terms, income = record(terms.income_policy);
  if (terms.goods_consumed !== true || terms.destination !== 'site_treasury') invalid();
  return { quote, input, earned: creditAmount(terms.earned), item_id: id(terms.item_id), site_node_id: id(terms.site_node_id), initialize_policy: bool(income.initialize), policy: policy(income.policy) };
}
export async function previewOrderCancellation(node: number, order: number) {
  const input = { order_id: id(order) }, quote = await preview(node, 'cancel', input);
  return { quote, input, released: creditAmount(quote.terms.released_reserve) };
}

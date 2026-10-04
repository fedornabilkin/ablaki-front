import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';
import { investmentAmount, creditAmount } from '@/entities/world/credits';
export type HarvestAction = 'price' | 'buy' | 'withdraw';
const invalid = (): never => { throw new Error('invalid-harvest-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const text = (value: unknown) => typeof value === 'string' && value.length <= 120 ? value : invalid();
const bool = (value: unknown) => typeof value === 'boolean' ? value : invalid();
const url = (node: number, suffix = 'harvest') => config.makeApiUrl(`v1/world/nodes/${id(node)}/${suffix}`);
export function harvestInput(action: HarvestAction, value: unknown) {
  const r = record(value), inventory_id = id(r.inventory_id);
  return action === 'price' ? { inventory_id, price: r.price === null ? null : investmentAmount(r.price) } : { inventory_id, quantity: integer(r.quantity, 1, 10000) };
}
export async function loadHarvest(node: number) {
  const r = record((await apiClient.get(url(node))).data);
  if (id(r.node_id) !== node || r.capacity !== 5 || !Array.isArray(r.items) || r.items.length > 5) invalid();
  const items = r.items.map(value => {
    const i = record(value);
    return { inventory_id: id(i.inventory_id), position: integer(i.position, 1, 5), name: text(i.name), icon: text(i.icon), quantity: integer(i.quantity, 0, 10000),
      price: i.price === null ? null : creditAmount(i.price), harvested_at: integer(i.harvested_at), fresh_until: integer(i.fresh_until), spoiled: bool(i.spoiled) };
  });
  if (new Set(items.map(i => i.position)).size !== items.length) invalid();
  return { items, owned_by_me: bool(r.owned_by_me), writable: bool(r.writable), server_time: integer(r.server_time) };
}
export async function previewHarvest(node: number, action: HarvestAction, value: unknown) {
  const input = harvestInput(action, value), quote = parseWorldQuote((await apiClient.post(url(node, `harvest-${action}-preview`), input)).data);
  if (quote.terms.node_id !== node || quote.terms.inventory_id !== input.inventory_id) invalid();
  return { input, quote };
}

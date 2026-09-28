import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, parseWorldQuote, record } from './world';

const invalid = (): never => { throw new Error('invalid-campsite-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const bool = (value: unknown) => typeof value === 'boolean' ? value : invalid();
const url = (node: number, action: string) => config.makeApiUrl(`v1/world/nodes/${id(node)}/${action}`);
export type SupplyAction = 'starter' | 'gather';

export async function loadCampsiteSupplies(node: number) {
  const row = record((await apiClient.get(url(node, 'campsite'))).data);
  const site = record(row.node), supplies = record(row.supplies);
  if (id(site.id) !== node) invalid();
  return { starterAvailable: bool(supplies.starter_available), gatherAvailable: bool(supplies.gather_available),
    gatherAvailableAt: integer(supplies.gather_available_at) };
}

export async function previewCampsiteSupplies(node: number, action: SupplyAction) {
  const quote = parseWorldQuote((await apiClient.post(url(node, `supplies-${action}-preview`), {})).data);
  const terms = quote.terms;
  if (id(terms.node_id) !== node || terms.action !== action || !Array.isArray(terms.items) || terms.items.length > 100) invalid();
  const items = terms.items.map(value => {
    const item = record(value);
    if (item.name !== undefined && (typeof item.name !== 'string' || !item.name || item.name.length > 120)) invalid();
    return { id: id(item.item_id), name: item.name as string | undefined, quantity: integer(item.quantity, 1, 100000) };
  });
  if (!items.length || new Set(items.map(item => item.id)).size !== items.length) invalid();
  return { quote, items, efficiency: integer(terms.efficiency_bps, 0, 10000) };
}

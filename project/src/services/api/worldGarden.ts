import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';
import { creditAmount, investmentAmount } from '@/entities/world/credits';
const invalid = (): never => { throw new Error('invalid-garden-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const bool = (value: unknown): boolean => typeof value === 'boolean' ? value : invalid();
const text = (value: unknown): string => typeof value === 'string' && value.trim().length > 0 && value.length <= 120 ? value : invalid();
const positive = (value: unknown) => { const amount = creditAmount(value); if (amount === '0.0000') invalid(); return amount; };
const url = (node: number, action = 'garden') => config.makeApiUrl(`v1/world/nodes/${id(node)}/${action}`);
export type GardenAction = 'publish' | 'withdraw' | 'buy' | 'expand';
export function gardenInput(action: GardenAction, value: unknown): Record<string, unknown> {
  const r = record(value);
  if (action === 'publish') return { name: text(r.name).trim(), price: investmentAmount(r.price), base_price: investmentAmount(r.base_price) };
  if (action === 'withdraw') return {};
  if (action === 'buy') return { top_up: bool(r.top_up) };
  if (action === 'expand') return { top_up: bool(r.top_up), quantity: integer(r.quantity, 1, 9) };
  return invalid();
}
export async function loadGarden(node: number) {
  const r = record((await apiClient.get(url(node))).data);
  if (id(r.node_id) !== node || r.cultivation_enabled !== false) invalid();
  let offer = null, garden = null;
  if (r.offer !== null) { const o = record(r.offer); offer = { id: id(o.id), name: text(o.name), price: positive(o.price), base_price: positive(o.base_price) }; }
  if (r.garden !== null) {
    const g = record(r.garden), unlocked = integer(g.unlocked, 1, 10);
    if (g.limit !== 10 || !Array.isArray(g.beds) || g.beds.length !== 10) invalid();
    const beds = (g.beds as unknown[]).map((value, index) => {
      const b = record(value), ordinal = integer(b.ordinal, 1, 10), open = bool(b.unlocked), price = creditAmount(b.price);
      if (ordinal !== index + 1 || open !== (ordinal <= unlocked) || (ordinal === 1 ? price !== '0.0000' : price === '0.0000')) invalid();
      return { node_id: id(b.node_id), ordinal, unlocked: open, price };
    });
    if (new Set(beds.map(b => b.node_id)).size !== 10) invalid();
    garden = { node_id: id(g.node_id), unlocked, beds, base_price: positive(g.base_price), available_budget: creditAmount(g.available_budget) };
  }
  const canBuy = bool(r.can_buy), canExpand = bool(r.can_expand);
  if ((canBuy && (!offer || garden)) || (canExpand && (!garden || garden.node_id !== node || garden.unlocked === 10))) invalid();
  return { offer, garden, can_buy: canBuy, can_expand: canExpand, can_publish: bool(r.can_publish), settlement_id: id(r.settlement_id), settlement_name: text(r.settlement_name), server_time: integer(r.server_time) };
}
export async function previewGarden(node: number, action: GardenAction, payload: unknown) {
  const input = gardenInput(action, payload);
  const quote = parseWorldQuote((await apiClient.post(url(node, `garden-${action}-preview`), input)).data), t = quote.terms;
  if (id(t.node_id) !== node) invalid();
  for (const [key, value] of Object.entries(input)) if (t[key] !== value) invalid();
  let payment = null;
  let unitPrices: { ordinal: number; price: string }[] = [];
  if (action === 'buy' || action === 'expand') {
    if (id(t.source_node_id) !== node) invalid();
    if (t.source_budget_id !== null) id(t.source_budget_id);
    const charge = creditAmount(t.personal_charge), before = t.wallet_before === null ? null : creditAmount(t.wallet_before), after = t.wallet_after === null ? null : creditAmount(t.wallet_after);
    if ((charge !== '0.0000' && (!input.top_up || before === null || after === null)) || (charge === '0.0000' && (before !== null || after !== null))) invalid();
    id(t.recipient_account_id); id(t.recipient_policy_id);
    payment = { total: positive(t.total), available: creditAmount(t.available_before), charge, walletAfter: after, recipient: text(t.recipient_name), recipientId: id(t.recipient_node_id), basePrice: positive(t.base_price) };
    if (t.initial_open !== 1 || t.limit !== 10) invalid();
    if (action === 'buy') { id(t.offer_id); text(t.name); }
    else {
      id(t.policy_id); integer(t.policy_revision, 1); const unlocked = integer(t.unlocked, 1, 9), quantity = integer(t.quantity, 1, 10 - unlocked);
      if (t.curve !== 'linear' || t.currency !== 'Cr' || !Array.isArray(t.unit_prices) || t.unit_prices.length !== quantity) invalid();
      unitPrices = (t.unit_prices as unknown[]).map((value, i) => { const u = record(value), ordinal = integer(u.ordinal, 2, 10); if (ordinal !== unlocked + i + 1) invalid(); return { ordinal, price: positive(u.price) }; });
    }
  } else if (t.previous_offer_id !== null) id(t.previous_offer_id);
  return { action, input, quote, payment, unitPrices };
}

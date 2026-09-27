import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';
import { creditAmount } from '@/entities/world/credits';
const invalid = (): never => { throw new Error('invalid-equipment-expansion-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const bool = (value: unknown): boolean => typeof value === 'boolean' ? value : invalid();
const positive = (value: unknown) => { const result = creditAmount(value); if (result === '0.0000') invalid(); return result; };
const exposure = (value: unknown): 'covered' | 'indoor' => value === 'covered' || value === 'indoor' ? value : invalid();
const url = (node: number, action: string) => config.makeApiUrl(`v1/world/nodes/${id(node)}/${action}`);
export function equipmentExpansionInput(value: unknown) {
  const r = record(value); return { quantity: integer(r.quantity, 1, 3), top_up: bool(r.top_up) };
}
export async function loadEquipmentExpansion(node: number) {
  const r = record((await apiClient.get(url(node, 'equipment-expansion'))).data);
  if (id(r.node_id) !== node) invalid();
  const supported = bool(r.supported), writable = bool(r.writable); let expansion = null;
  if (r.expansion !== null) {
    const e = record(r.expansion), initial = integer(e.initial_open, 1, 3), limit = integer(e.limit, initial + 1, 4), unlocked = integer(e.unlocked, initial, limit);
    if (!Array.isArray(e.places) || e.places.length !== limit) invalid();
    const places = (e.places as unknown[]).map((value, index) => {
      const p = record(value), position = integer(p.position, 1, limit), open = bool(p.unlocked), price = creditAmount(p.price);
      if (position !== index + 1 || open !== (position <= unlocked) || (position <= initial ? price !== '0.0000' : price === '0.0000')) invalid();
      return { position, unlocked: open, price };
    });
    expansion = { initial, limit, unlocked, places, basePrice: positive(e.base_price), storageId: id(e.storage_id), exposure: exposure(e.exposure_class) };
  }
  if (supported !== (expansion !== null) || (writable && !supported)) invalid();
  return { supported, writable, expansion, available: creditAmount(r.available_budget), serverTime: integer(r.server_time) };
}
export async function previewEquipmentExpansion(node: number, payload: unknown) {
  const input = equipmentExpansionInput(payload), quote = parseWorldQuote((await apiClient.post(url(node, 'equipment-expand-preview'), input)).data), t = quote.terms;
  if (id(t.node_id) !== node || t.quantity !== input.quantity || t.top_up !== input.top_up || t.currency !== 'Cr' || t.curve !== 'linear') invalid();
  const initial = integer(t.initial_open, 1, 3), limit = integer(t.limit, initial + 1, 4), unlocked = integer(t.unlocked, initial, limit - 1);
  if (input.quantity > limit - unlocked || !Array.isArray(t.unit_prices) || t.unit_prices.length !== input.quantity) invalid();
  const unitPrices = (t.unit_prices as unknown[]).map((value, index) => { const p = record(value); if (integer(p.ordinal) !== unlocked + index + 1) invalid(); return { ordinal: integer(p.ordinal, 2, limit), price: positive(p.price) }; });
  id(t.policy_id); integer(t.policy_revision, 1); id(t.template_revision_id); positive(t.base_price); id(t.storage_id); exposure(t.exposure_class);
  if (t.source_budget_id !== null) id(t.source_budget_id);
  id(t.recipient_node_id); id(t.recipient_account_id); id(t.recipient_policy_id);
  if (typeof t.recipient_name !== 'string' || !t.recipient_name.trim() || t.recipient_name.length > 120) invalid();
  const charge = creditAmount(t.personal_charge), before = t.wallet_before === null ? null : creditAmount(t.wallet_before), after = t.wallet_after === null ? null : creditAmount(t.wallet_after);
  if ((charge !== '0.0000' && (!input.top_up || before === null || after === null)) || (charge === '0.0000' && (before !== null || after !== null))) invalid();
  return { input, quote, unitPrices, payment: { total: positive(t.total), available: creditAmount(t.available_before), charge, walletAfter: after, recipient: t.recipient_name } };
}

import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';
import { creditAmount, investmentAmount } from '@/entities/world/credits';
import { parseConstructionSpec, validateConstructionPlan } from './worldConstruction';
const invalid = (): never => { throw new Error('invalid-premises-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const text = (value: unknown): string => typeof value === 'string' && value.trim().length > 0 && value.length <= 120 ? value : invalid();
const bool = (value: unknown): boolean => typeof value === 'boolean' ? value : invalid();
const url = (node: number, action = 'premises') => config.makeApiUrl(`v1/world/nodes/${id(node)}/${action}`);
export function premisesPublicationInput(value: unknown) {
  const r = record(value);
  if (r.kind !== 'canopy' && r.kind !== 'workroom' && r.kind !== 'house') invalid();
  const area = integer(r.area, 1, 4);
  const lodging_places = r.kind === 'house' ? 1 : 0;
  const slots = integer(r.slots, 1, area - lodging_places), expansion_limit = integer(r.expansion_limit ?? slots, slots, area - lodging_places);
  const expansion_base_price = expansion_limit > slots ? investmentAmount(r.expansion_base_price) : null;
  if (expansion_limit === slots && r.expansion_base_price !== undefined && r.expansion_base_price !== null) invalid();
  return { name: text(r.name).trim(), kind: r.kind as 'canopy' | 'workroom' | 'house', area, slots, price: investmentAmount(r.price), expansion_limit, expansion_base_price, lodging_places };
}
function premises(value: unknown) {
  const r = record(value), input = premisesPublicationInput(r);
  if (creditAmount(r.price) !== input.price || r.exposure_class !== (input.kind === 'canopy' ? 'covered' : 'indoor') || (r.lodging_places ?? 0) !== input.lodging_places) invalid();
  return { ...input, ...parseConstructionSpec(r), exposure_class: r.exposure_class as 'covered' | 'indoor' };
}
export async function loadPremises(node: number, params: Record<string, unknown>) {
  const r = record((await apiClient.get(url(node), { params })).data), meta = record(r._meta);
  if (id(r.node_id) !== node || !Array.isArray(r.items) || r.items.length > 20) invalid();
  const items = (r.items as unknown[]).map(value => { const row = record(value); return { ...premises(row), id: id(row.id), template_revision_id: id(row.template_revision_id) }; });
  const total = integer(meta.totalCount), pageSize = integer(meta.perPage, 20, 20);
  if (integer(meta.pageCount) !== Math.ceil(total / pageSize) || items.length > total || new Set(items.map(item => item.id)).size !== items.length) invalid();
  let area = null;
  if (r.area !== null) {
    const a = record(r.area); area = { total: integer(a.total), used: integer(a.used), available: integer(a.available, 0, integer(a.total)), unaccounted_building: bool(a.unaccounted_building) };
  }
  if (bool(r.can_buy) && !area) invalid();
  return { items, total, pageSize, currentPage: integer(meta.currentPage, 1, 1000000), area, can_buy: bool(r.can_buy), can_publish: bool(r.can_publish),
    settlement_id: id(r.settlement_id), settlement_name: text(r.settlement_name), server_time: integer(r.server_time) };
}
export type PremisesAction = 'publish' | 'buy' | 'withdraw';
export async function previewPremises(node: number, action: PremisesAction, payload: unknown) {
  const r = record(payload);
  const input = action === 'publish' ? premisesPublicationInput(r) : { offer_id: id(r.offer_id) };
  const quote = parseWorldQuote((await apiClient.post(url(node, `premises-${action}-preview`), input)).data), terms = quote.terms;
  if (id(terms.node_id) !== node) invalid();
  for (const [key, value] of Object.entries(input)) if (terms[key] !== value) invalid();
  const room = action === 'withdraw' ? null : premises(terms.config);
  if (room) { const c = record(terms.config); if (c.lodging_places !== room.lodging_places) invalid(); }
  let payment = null;
  if (action === 'buy') {
    if (room?.delivery === 'construction') {
      if (terms.cancellation !== 'full_refund_before_completion') invalid();
      validateConstructionPlan(terms.material_plan, room.materials);
    }
    if (creditAmount(terms.personal_charge) !== '0.0000') invalid();
    payment = { source_budget_id: id(terms.source_budget_id), recipient_node_id: id(terms.recipient_node_id), recipient_name: text(terms.recipient_name), recipient_account_id: id(terms.recipient_account_id), available_area: integer(terms.available_area), template_revision_id: id(terms.template_revision_id) };
    id(terms.recipient_policy_id);
  }
  return { action, input, quote, room, payment, name: room?.name ?? text(terms.name) };
}

import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';
import { creditAmount, investmentAmount } from '@/entities/world/credits';
import { parseConstructionMaterials, validateConstructionPlan } from './worldConstruction';
const invalid = (): never => { throw new Error('invalid-building-repair-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const text = (value: unknown): string => typeof value === 'string' && value.trim().length > 0 && value.length <= 2000 ? value : invalid();
const bool = (value: unknown): boolean => typeof value === 'boolean' ? value : invalid();
const url = (node: number, action = 'building-repair') => config.makeApiUrl(`v1/world/nodes/${id(node)}/${action}`);
export function parseBuildingRepairPolicy(value: unknown) {
  if (value === undefined || value === null) return null;
  const row = record(value), materials = parseConstructionMaterials(row.materials);
  if (!materials.length) invalid();
  return { full_price: investmentAmount(row.full_price), materials };
}
function cost(value: unknown) {
  const row = record(value), condition_after = integer(row.condition_after, 1, 1000000), condition_before = integer(row.condition_before, 0, condition_after);
  const restore = integer(row.restore, 0, condition_after), price = creditAmount(row.price);
  if (restore !== condition_after - condition_before || !Array.isArray(row.materials) || !row.materials.length || row.materials.length > 8 || (restore === 0) !== (price === '0.0000')) return invalid();
  const materials = row.materials.map(value => {
    const r = record(value), quantity = integer(r.quantity, restore ? 1 : 0, restore ? 10000 : 0), have = integer(r.have), available = bool(r.available);
    const full_quantity = integer(r.full_quantity, 1, 10000);
    if (available !== (have >= quantity) || quantity !== Math.ceil(full_quantity * restore / condition_after)) invalid();
    return { item_id: id(r.item_id), name: text(r.name), full_quantity, quantity, have, available };
  });
  if (new Set(materials.map(item => item.item_id)).size !== materials.length) invalid();
  return { condition_before, condition_after, restore, price, materials };
}
export async function loadBuildingRepair(node: number) {
  const row = record((await apiClient.get(url(node))).data);
  if (id(row.node_id) !== node || !Array.isArray(row.reasons) || row.reasons.length > 32) return invalid();
  const reasons = row.reasons.map(text), available = bool(row.available), supported = bool(row.supported);
  const repair = row.repair === null ? null : cost(row.repair);
  if (available !== (reasons.length === 0) || (available && (!supported || !repair || !repair.restore || repair.materials.some(item => !item.available)))) invalid();
  integer(row.server_time);
  return { node, supported, available, reasons, repair, writable: bool(row.writable), budget: creditAmount(row.available_budget) };
}
export async function previewBuildingRepair(node: number) {
  const quote = parseWorldQuote((await apiClient.post(url(node, 'building-repair-preview'), {})).data), terms = quote.terms;
  if (id(terms.node_id) !== node || terms.personal_charge !== '0.0000' || !['active', 'paused', 'damaged'].includes(terms.status_before as string)) invalid();
  const repair = cost(terms.repair), budget = creditAmount(terms.available_before), fullPrice = investmentAmount(terms.full_price);
  if (!repair.restore || repair.materials.some(item => !item.available) || terms.status_after !== (terms.status_before === 'active' && repair.condition_before > 0 ? 'active' : 'paused')) invalid();
  id(terms.purchase_id); id(terms.template_revision_id); id(terms.source_budget_id); id(terms.recipient_account_id); id(terms.recipient_policy_id);
  if (terms.repair_contract_id !== undefined && terms.repair_contract_id !== null) id(terms.repair_contract_id);
  if (terms.repair_template_revision_id !== undefined) id(terms.repair_template_revision_id);
  validateConstructionPlan(terms.material_plan, repair.materials);
  return { node, quote, name: text(terms.name), repair, budget, fullPrice, recipient: { id: id(terms.recipient_node_id), name: text(terms.recipient_name) }, statusAfter: terms.status_after as 'active' | 'paused' };
}

import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';
import { parseBuildingRepairPolicy } from './worldBuildingRepair';
const invalid = (): never => { throw new Error('invalid-repair-contract-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const text = (value: unknown): string => typeof value === 'string' && value.trim().length > 0 && value.length <= 2000 ? value : invalid();
const bool = (value: unknown): boolean => typeof value === 'boolean' ? value : invalid();
const reasons = (value: unknown): string[] => Array.isArray(value) && value.length <= 32 ? value.map(text) : invalid();
const policy = (value: unknown) => { const result = parseBuildingRepairPolicy(value); return result || invalid(); };
const url = (node: number, action = 'repair-contracts') => config.makeApiUrl(`v1/world/nodes/${id(node)}/${action}`);
function offer(value: unknown) {
  const row = record(value);
  if (!['canopy', 'workroom', 'house'].includes(row.kind as string)) return invalid();
  return { offer_id: id(row.offer_id), name: text(row.name), template_revision_id: id(row.template_revision_id), kind: row.kind as 'canopy' | 'workroom' | 'house', area: integer(row.area, 1, 4), repair: policy(row.repair) };
}
export async function loadRepairContracts(node: number, params: Record<string, unknown>) {
  const row = record((await apiClient.get(url(node), { params })).data), meta = record(row._meta);
  if (id(row.node_id) !== node || !Array.isArray(row.items) || row.items.length > 20) return invalid();
  const items = row.items.map(value => {
    const r = record(value), result = offer(r), blocked = reasons(r.reasons), available = bool(r.available);
    if (available !== !blocked.length) invalid();
    return { ...result, available, reasons: blocked };
  });
  let contract = null;
  if (row.contract !== null) {
    const c = record(row.contract);
    if (c.source !== 'purchase' && c.source !== 'supplement') return invalid();
    const contractId = c.id === null ? null : id(c.id);
    if ((contractId === null) !== (c.source === 'purchase')) invalid();
    contract = { id: contractId, source: c.source, repair: policy(c.repair), accepted_at: integer(c.accepted_at), template_revision_id: id(c.template_revision_id) };
  }
  const eligible = bool(row.eligible), blocked = reasons(row.reasons), total = integer(meta.totalCount), pageSize = integer(meta.perPage, 20, 20);
  if (eligible !== !blocked.length || (contract && eligible) || (!eligible && (items.length || total)) || integer(meta.pageCount) !== Math.ceil(total / pageSize) || items.length > total || items.some((item, i) => i > 0 && item.offer_id >= items[i - 1].offer_id)) invalid();
  integer(row.server_time);
  return { items, contract, eligible, reasons: blocked, writable: bool(row.writable), total, pageSize, currentPage: integer(meta.currentPage, 1, 1000000) };
}
export async function previewRepairContract(node: number, offerId: number) {
  const input = { offer_id: id(offerId) }, quote = parseWorldQuote((await apiClient.post(url(node, 'repair-contract-preview'), input)).data), terms = quote.terms;
  if (id(terms.node_id) !== node || id(terms.offer_id) !== offerId || terms.price !== '0.0000') invalid();
  id(terms.purchase_id);
  return { node, input, quote, offer: offer(terms), buildingName: text(terms.building_name), recipient: { id: id(terms.recipient_node_id), name: text(terms.recipient_name) } };
}

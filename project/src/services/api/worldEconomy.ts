import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';
import { creditAmount, investmentAmount } from '@/entities/world/credits';
const invalid = (): never => { throw new Error('invalid-economy-response'); };
const text = (value: unknown, max = 255) => typeof value === 'string' && value.length <= max ? value : invalid();
const boolean = (value: unknown) => typeof value === 'boolean' ? value : invalid();
const id = (value: unknown) => integer(value, 1, 2147483647);
const url = (node: number, suffix: string) => config.makeApiUrl(`v1/world/nodes/${id(node)}/${suffix}`);
function collectionRule(value: unknown) {
  if (value === null) return null;
  const r = record(value), loss = r.loss_policy === null ? null : record(r.loss_policy);
  if (!['root', 'unconfigured', 'published'].includes(String(r.status)) || r.basis !== 'collected_revenue') invalid();
  const rule = { revision: id(r.revision), parent_node_id: r.parent_node_id === null ? null : id(r.parent_node_id), status: text(r.status, 24),
    rate_bps: r.rate_bps === null ? null : integer(r.rate_bps, 0, 10000), due_seconds: r.due_seconds === null ? null : integer(r.due_seconds, 3600, 31536000),
    loss: loss ? { protected_seconds: integer(loss.protected_seconds, 0, 31536000), period_seconds: integer(loss.loss_period_seconds, 3600, 2592000), rate_bps: integer(loss.loss_rate_bps, 0, 10000) } : null };
  if (rule.status === 'published' && (rule.rate_bps === null || rule.due_seconds === null || !rule.loss)) invalid();
  return rule;
}
export async function loadNodeEconomy(node: number, page: number) {
  const r = record((await apiClient.get(url(node, 'economy'), { params: { page } })).data), entries = record(r.entries), meta = record(entries._meta);
  if (r.currency !== 'Cr' || !Array.isArray(entries.items) || entries.items.length > 50) invalid();
  const b = r.balances === null ? null : record(r.balances), owner = boolean(r.can_view_finances);
  const rule = collectionRule(r.collection_rule), collect = boolean(r.collect_available), pay = boolean(r.can_pay), catchingUp = boolean(r.treasury_catching_up);
  if (owner !== (b !== null) || (!owner && (entries.items.length || rule || collect || pay || catchingUp)) || (collect && (rule?.status !== 'published' || catchingUp))) invalid();
  const items = entries.items.map(value => { const item = record(value); return { id: id(item.id), kind: text(item.kind, 32), amount: creditAmount(item.amount), purpose: text(item.purpose), created_at: integer(item.created_at) }; });
  const total = integer(meta.totalCount), pageSize = integer(meta.perPage, 50, 50), currentPage = integer(meta.currentPage, 1, 1000000);
  if (integer(meta.pageCount) !== Math.ceil(total / pageSize) || new Set(items.map(i => i.id)).size !== items.length || id(r.node_id) !== node) invalid();
  return { node_id: node, balances: b ? { budget: creditAmount(b.budget), reserved: creditAmount(b.reserved), available: creditAmount(b.available), treasury: creditAmount(b.treasury) } : null,
    can_invest: boolean(r.can_invest), wallet_ready: boolean(r.wallet_ready), can_collect: collect, can_pay: pay, catching_up: catchingUp, rule, entries: { items, total, pageSize, currentPage } };
}
export async function loadObligations(node: number, page: number) {
  const r = record((await apiClient.get(url(node, 'obligations'), { params: { page } })).data), meta = record(r._meta);
  if (id(r.node_id) !== node || !Array.isArray(r.items) || r.items.length > 50) invalid();
  const items = (r.items as unknown[]).map(value => {
    const item = record(value);
    if (item.status !== 'pending' && item.status !== 'paid') invalid();
    const paid = item.paid_at === null ? null : integer(item.paid_at);
    if ((item.status === 'paid') !== (paid !== null)) invalid();
    return { id: id(item.id), amount: creditAmount(item.amount), parent_node_id: id(item.parent_node_id), rule_revision: id(item.rule_revision),
      status: item.status as 'pending' | 'paid', due_at: integer(item.due_at), paid_at: paid };
  });
  const total = integer(meta.totalCount), pageSize = integer(meta.perPage, 50, 50), currentPage = integer(meta.currentPage, 1, 1000000);
  if (integer(meta.pageCount) !== Math.ceil(total / pageSize) || items.length > total || new Set(items.map(i => i.id)).size !== items.length) invalid();
  return { items, total, pageSize, currentPage, server_time: integer(r.server_time) };
}
export async function previewCollection(node: number) {
  const quote = parseWorldQuote((await apiClient.post(url(node, 'collect-preview'), {})).data), t = quote.terms;
  if (id(t.node_id) !== node || typeof t.plan_hash !== 'string' || !/^[a-f0-9]{64}$/.test(t.plan_hash)) invalid();
  return { quote, collected: creditAmount(t.collected), reserved: creditAmount(t.reserved_for_parent),
    budget_after: creditAmount(t.budget_after), available_after: creditAmount(t.available_after), treasury_after: creditAmount(t.treasury_after),
    parent_node_id: t.parent_node_id === null ? null : id(t.parent_node_id), more_pending: boolean(t.more_pending),
    rule_revision: id(t.rule_revision), due_seconds: integer(t.due_seconds, 3600, 31536000) };
}
export async function previewPayment(node: number, obligation: number) {
  const input = { obligation_id: id(obligation) };
  const quote = parseWorldQuote((await apiClient.post(url(node, 'pay-preview'), input)).data), t = quote.terms;
  if (id(t.node_id) !== node || id(t.obligation_id) !== obligation || t.destination !== 'parent_treasury') invalid();
  return { quote, input, amount: creditAmount(t.payment_amount), parent_node_id: id(t.parent_node_id), budget_after: creditAmount(t.budget_after), reserved_after: creditAmount(t.reserved_after) };
}
export interface FinancePolicyInput { rate_bps: number; due_seconds: number; protected_seconds: number; loss_period_seconds: number; loss_rate_bps: number; reason: string }
export function financePolicyInput(value: unknown): FinancePolicyInput {
  const r = record(value), reason = text(r.reason).trim();
  if (!reason) invalid();
  return { rate_bps: integer(r.rate_bps, 0, 10000), due_seconds: integer(r.due_seconds, 3600, 31536000), protected_seconds: integer(r.protected_seconds, 0, 31536000),
    loss_period_seconds: integer(r.loss_period_seconds, 3600, 2592000), loss_rate_bps: integer(r.loss_rate_bps, 0, 10000), reason };
}
export async function previewFinancePolicy(node: number, payload: FinancePolicyInput) {
  const input = financePolicyInput(payload), quote = parseWorldQuote((await apiClient.post(url(node, 'finance-policy-preview'), input)).data), t = quote.terms;
  for (const key of Object.keys(input) as (keyof FinancePolicyInput)[]) if (t[key] !== input[key]) invalid();
  if (id(t.node_id) !== node || t.basis !== 'collected_revenue' || t.existing_receipts_unchanged !== true || t.existing_obligations_unchanged !== true) invalid();
  return { quote, input, revision: id(t.revision), parent_node_id: t.parent_node_id === null ? null : id(t.parent_node_id) };
}
export async function previewInvestment(node: number, amount: string, purpose: string) {
  const input = { amount: investmentAmount(amount), purpose: purpose.trim() };
  const quote = parseWorldQuote((await apiClient.post(url(node, 'invest-preview'), input)).data), t = quote.terms;
  if (id(t.node_id) !== node || t.currency !== 'Cr' || t.destination !== 'budget' || t.automatic_return !== false || t.amount !== input.amount || t.purpose !== input.purpose) invalid();
  return { quote, input, name: text(t.node_name, 120), amount: creditAmount(t.amount), wallet_before: creditAmount(t.wallet_before), wallet_after: creditAmount(t.wallet_after) };
}

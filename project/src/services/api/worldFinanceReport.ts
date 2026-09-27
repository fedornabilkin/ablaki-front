import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record } from './world';
import { creditAmount } from '@/entities/world/credits';
const invalid = (): never => { throw new Error('invalid-finance-report-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const text = (value: unknown, max: number): string => typeof value === 'string' && value.length <= max ? value : invalid();
// Turnover is not a spendable balance: it can exceed the wallet's range. No JS Number conversion.
const totalAmount = (value: unknown, signed = false): string => typeof value === 'string' && (signed ? /^-?(0|[1-9]\d{0,39})\.\d{4}$/ : /^(0|[1-9]\d{0,39})\.\d{4}$/).test(value) ? value : invalid();
export const financeKinds: Record<string, string> = {
  personal_investment: 'Вложение личных Cr', treasury_collection: 'Сбор казны в бюджет', parent_payment: 'Отчисление родительскому объекту', treasury_loss: 'Потеря казны',
  order_payment: 'Оплата заказа', premises_purchase: 'Покупка помещения', garden_purchase: 'Покупка огорода', garden_expansion: 'Открытие грядок', equipment_expansion: 'Открытие мест оборудования', building_repair: 'Ремонт здания',
};
export const financeDirections = { incoming: 'Поступление', outgoing: 'Списание', internal: 'Внутренний перевод' };
export const financeTotals = {
  treasury_received: 'Всего поступило извне в казну', treasury_parent_received: 'Из них — отчисления других объектов',
  treasury_payments_received: 'Из них — оплата заказов, покупок и работ', treasury_other_received: 'Из них — прочие поступления',
  treasury_to_budget: 'Казна → свой бюджет', budget_to_treasury: 'Свой бюджет → своя казна',
  treasury_lost: 'Потеряно из казны', treasury_other_out: 'Прочие списания казны', budget_invested: 'Личные Cr → бюджет',
  budget_other_in: 'Прочие поступления в бюджет', budget_parent_paid: 'Бюджет → казна родительского объекта',
  budget_spent: 'Из бюджета оплачены заказы, покупки и работы', budget_other_out: 'Прочие списания бюджета',
};
type TotalKey = keyof typeof financeTotals;
type Role = 'budget' | 'treasury';
const role = (value: unknown): Role | null => value === null || value === 'budget' || value === 'treasury' ? value : invalid();

export async function loadFinanceReport(node: number, params: Record<string, unknown>) {
  const r = record((await apiClient.get(config.makeApiUrl(`v1/world/nodes/${id(node)}/finance-report`), { params })).data), meta = record(r._meta);
  if (id(r.node_id) !== node || r.currency !== 'Cr' || r.scope !== 'node_lifetime' || !Array.isArray(r.items) || r.items.length > 20) return invalid();
  const b = record(r.balances), reconciliation = record(r.reconciliation), totals = record(r.totals);
  const balances = (['budget', 'treasury'] as const).map(name => {
    const account = record(b[name]), check = record(reconciliation[name]);
    const amount = creditAmount(account.amount), ledgerBalance = totalAmount(check.ledger_balance, true);
    if (typeof check.matches !== 'boolean' || check.matches !== (amount === ledgerBalance)) invalid();
    return { role: name, amount, reserved: creditAmount(account.reserved), available: creditAmount(account.available), ledgerBalance, matches: check.matches };
  });
  const flows = (Object.keys(financeTotals) as TotalKey[]).map(key => ({ key, label: financeTotals[key], amount: totalAmount(totals[key]) }));
  const items = r.items.map(value => {
    const item = record(value), source = role(item.source_role), destination = role(item.destination_role);
    if (!source && !destination) return invalid();
    const direction = source && destination ? 'internal' : source ? 'outgoing' : 'incoming';
    if (item.direction !== direction) invalid();
    return { id: id(item.id), kind: text(item.kind, 32), purpose: text(item.purpose, 255), amount: creditAmount(item.amount), at: integer(item.created_at), source, destination, direction: direction as keyof typeof financeDirections };
  });
  const total = integer(meta.totalCount), pageSize = integer(meta.perPage, 20, 20), currentPage = integer(meta.currentPage, 1, 1000000);
  if (integer(meta.pageCount) !== Math.ceil(total / pageSize) || items.length !== Math.min(pageSize, Math.max(0, total - (currentPage - 1) * pageSize))
    || items.some((item, i) => i > 0 && item.id >= items[i - 1].id)) invalid();
  return { balances, flows, items, total, pageSize, currentPage, now: integer(r.server_time) };
}

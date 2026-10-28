import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record } from './world';
import { creditAmount } from '@/entities/world/credits';

const invalid = (): never => { throw new Error('invalid-treasury-receipts-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const text = (value: unknown, max: number): string => typeof value === 'string' && value.length <= max ? value : invalid();
export const receiptStates = {
  protected: 'Защищено', waiting: 'Ожидает следующего периода', catching_up: 'Ожидает расчёта потерь', exempt: 'Без потерь', closed: 'Закрыто',
};
type ReceiptState = keyof typeof receiptStates;
const greater = (a: string, b: string) => a.padStart(20, '0') > b.padStart(20, '0');

function receipt(value: unknown, now: number) {
  const r = record(value), state = text(r.state, 24);
  if (!Object.keys(receiptStates).includes(state)) return invalid();
  const original = creditAmount(r.original_amount), remaining = creditAmount(r.remaining_amount), collected = creditAmount(r.collected_amount), lost = creditAmount(r.lost_amount);
  if ([remaining, collected, lost].some(amount => greater(amount, original))) invalid();
  const received = integer(r.received_at), closed = r.closed_at === null ? null : integer(r.closed_at);
  const protectedSeconds = integer(r.protected_seconds, 0, 31536000), protectedUntil = integer(r.protected_until);
  const rate = integer(r.loss_rate_bps, 0, 10000), period = integer(r.loss_period_seconds, 3600, 2592000);
  const age = integer(r.age_seconds), pending = integer(r.pending_periods), processed = integer(r.processed_periods);
  const next = r.next_loss_at === null ? null : integer(r.next_loss_at), nextAmount = r.next_loss_amount === null ? null : creditAmount(r.next_loss_amount);
  const scheduled = closed === null && rate > 0;
  if ((state === 'closed') !== (closed !== null) || (closed !== null && (closed < received || remaining !== '0.0000'))
    || protectedUntil !== received + protectedSeconds || age !== Math.max(0, (closed ?? now) - received)
    || scheduled !== (next !== null && nextAmount !== null) || (!scheduled && (next !== null || nextAmount !== null))) invalid();
  if (scheduled && (next !== protectedUntil + period * (processed + 1) || (nextAmount !== null && greater(nextAmount, remaining)))) invalid();
  const due = next !== null && next <= now ? Math.floor((now - next) / period) + 1 : 0;
  const expected = closed !== null ? 'closed' : rate === 0 ? 'exempt' : due > 0 ? 'catching_up' : now < protectedUntil ? 'protected' : 'waiting';
  if (pending !== due || state !== expected) invalid();
  return { id: id(r.id), kind: text(r.kind, 32), purpose: text(r.purpose, 255), state: state as ReceiptState,
    original, remaining, collected, lost, received, closed, age, protectedSeconds, protectedUntil, rate, period,
    policyRevision: id(r.policy_revision), pending, processed, next, nextAmount };
}

export async function loadTreasuryReceipts(node: number, params: Record<string, unknown>) {
  const r = record((await apiClient.get(config.makeApiUrl(`v1/world/nodes/${id(node)}/treasury-receipts`), { params })).data), meta = record(r._meta);
  if (id(r.node_id) !== node || r.currency !== 'Cr' || typeof r.treasury_catching_up !== 'boolean' || !Array.isArray(r.items) || r.items.length > 20) return invalid();
  const now = integer(r.server_time), items = r.items.map(value => receipt(value, now));
  const total = integer(meta.totalCount), pageSize = integer(meta.perPage, 20, 20), currentPage = integer(meta.currentPage, 1, 1000000);
  if (integer(meta.pageCount) !== Math.ceil(total / pageSize) || items.length !== Math.min(pageSize, Math.max(0, total - (currentPage - 1) * pageSize))
    || items.some((item, i) => (i > 0 && item.id >= items[i - 1].id) || (item.pending > 0 && !r.treasury_catching_up))) invalid();
  return { items, total, pageSize, currentPage, now, catchingUp: r.treasury_catching_up };
}

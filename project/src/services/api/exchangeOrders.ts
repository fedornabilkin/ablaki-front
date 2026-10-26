import { record, type RecordData } from './portal';

export interface ExchangeOrder extends RecordData {
  user_id: number;
  user_client: number;
  type: 'buy' | 'sell' | 'unknown';
  credit: number;
  amount: number;
}
function numeric(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '' || !Number.isFinite(Number(value))) throw new Error('invalid-response');
  return Number(value);
}
export function exchangeOrder(value: unknown): ExchangeOrder {
  const data = record(value);
  const user_id = numeric(data.user_id);
  const user_client = data.user_client == null ? 0 : numeric(data.user_client);
  const credit = numeric(data.credit);
  const amount = numeric(data.amount);
  if (!Number.isSafeInteger(user_id) || user_id < 1 || !Number.isSafeInteger(user_client) || user_client < 0 || credit <= 0 || amount <= 0 || typeof data.type !== 'string' || !data.type.trim() || data.type.length > 32) throw new Error('invalid-response');
  const rawType = data.type.trim();
  if (!['buy', 'sell', '0'].includes(rawType)) throw new Error('invalid-response');
  const type = rawType === 'buy' ? 'buy' : rawType === 'sell' ? 'sell' : 'unknown';
  return { ...data, user_id, user_client, credit, amount, type };
}
// The API type names describe the counterparty's action, not the creator's intent.
export function exchangeDirection(order: ExchangeOrder, userId: number): 'buy' | 'sell' | null {
  if (!Number.isSafeInteger(userId) || userId < 1) return null;
  if (order.type === 'unknown') return null;
  if (userId === order.user_id) return order.type === 'buy' ? 'sell' : 'buy';
  if (order.user_client === 0 || order.user_client === userId) return order.type;
  return null;
}
export function affordableOrder(order: ExchangeOrder, userId: number, account: Record<string, unknown>): boolean {
  if (order.type === 'unknown' || order.user_client !== 0 || order.user_id === userId || !Number.isSafeInteger(userId) || userId < 1) return false;
  const funds = account[order.type === 'buy' ? 'balance' : 'credit'];
  if (typeof funds !== 'number' && typeof funds !== 'string') return false;
  const cost = order.type === 'buy' ? order.amount : order.credit;
  return funds !== '' && Number.isFinite(Number(funds)) && Number(funds) >= cost;
}

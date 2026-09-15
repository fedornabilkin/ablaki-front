import config from '@/config/config';
import { apiClient } from '@/services/httpClient';
import { list, record, type RecordData } from './portal';

export interface PrizeFund { today: number; tomorrow: number; user_today: number | null; user_tomorrow: number | null; date: string; timezone: string; }
function amount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('invalid-response');
  return value;
}
export function parsePrizeFund(value: unknown): PrizeFund {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid-response');
  const data = value as Record<string, unknown>;
  if (typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || data.timezone !== 'Europe/Moscow') throw new Error('invalid-response');
  return { date: data.date, timezone: data.timezone, today: amount(data.today), tomorrow: amount(data.tomorrow),
    user_today: data.user_today === null ? null : amount(data.user_today), user_tomorrow: data.user_tomorrow === null ? null : amount(data.user_tomorrow) };
}
export async function prizeFund(authenticated: boolean): Promise<PrizeFund> {
  const result = parsePrizeFund((await apiClient.get(config.makeApiUrl(`v1/bonus/${authenticated ? 'my-fund' : 'fund'}`))).data);
  if ((result.user_today !== null) !== authenticated || (result.user_tomorrow !== null) !== authenticated) throw new Error('invalid-response');
  return result;
}
export interface BonusRecipient extends RecordData { amount: number; user: RecordData; }
export async function bonusRecipients(page: number, params: Record<string, unknown>) {
  const result = await list('bonus/recipients', page, params);
  return { ...result, items: result.items.map(item => ({ ...item, amount: amount(item.amount), user: record(item.user) } as BonusRecipient)) };
}

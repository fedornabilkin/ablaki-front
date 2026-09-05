import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import type { RecordData } from './portal';

export type GameKind = 'orel' | 'saper';
export interface GameSummary {
  today: { played: number; wins: number; balance: number; date: string; timezone: string };
  own: { count: number; amount: number };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid-response');
  return value as Record<string, unknown>;
}
function number(value: unknown, count = false): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '' || !Number.isFinite(Number(value))) throw new Error('invalid-response');
  const result = Number(value);
  if (count && (!Number.isSafeInteger(result) || result < 0)) throw new Error('invalid-response');
  return result;
}
export function summaryData(value: unknown): GameSummary {
  const data = object(value);
  const today = object(data.today);
  const own = object(data.own);
  const played = number(today.played, true);
  const wins = number(today.wins, true);
  const amount = number(own.amount);
  if (wins > played || amount < 0 || typeof today.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(today.date) || typeof today.timezone !== 'string' || !today.timezone.trim()) throw new Error('invalid-response');
  return {
    today: { played, wins, balance: number(today.balance), date: today.date, timezone: today.timezone },
    own: { count: number(own.count, true), amount },
  };
}
export async function gameSummary(kind: GameKind): Promise<GameSummary> {
  return summaryData((await apiClient.get(config.makeApiUrl(`v1/${kind}/summary`))).data);
}
export function winnerName(game: RecordData): string | null {
  if (typeof game.win !== 'boolean') return null;
  const name = game.win ? game.username_gamer : game.username;
  return typeof name === 'string' && name.trim() ? name : null;
}
export function playerOutcome(game: RecordData, user: unknown): 'Победа' | 'Поражение' | 'Нет результата' {
  if (typeof game.win !== 'boolean' || !user || typeof user !== 'object') return 'Нет результата';
  const current = user as Record<string, unknown>;
  const username = typeof current.username === 'string' ? current.username : null;
  const id = Number(current.id);
  const matches = (idValue: unknown, name: unknown) => Number.isSafeInteger(id) && id > 0 && idValue != null
    ? id === Number(idValue) : username !== null && username === name;
  if (matches(game.user_gamer, game.username_gamer)) return game.win ? 'Победа' : 'Поражение';
  if (matches(game.user_id, game.username)) return game.win ? 'Поражение' : 'Победа';
  return 'Нет результата';
}
export function signedAmount(value: number): string {
  return (value > 0 ? '+' : '') + value.toLocaleString('ru-RU', { maximumFractionDigits: 5 });
}

import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
export interface PeriodStats { total: number; today: number; yesterday: number; }
export interface Statistics { users: PeriodStats; games: { orel: PeriodStats; saper: PeriodStats }; forum: { themes: PeriodStats; comments: PeriodStats }; transfers: PeriodStats; exchange: PeriodStats; }
export function decodeStatistics(raw: unknown): Statistics {
  if (!raw || typeof raw !== 'object') throw new Error('invalid-statistics');
  const data = raw as Record<string, unknown>;
  const games = data.games as Record<string, unknown> | undefined;
  const forum = data.forum as Record<string, unknown> | undefined;
  const count = (value: unknown) => {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('invalid-statistics');
    return value;
  };
  const periods = (value: unknown): PeriodStats => {
    if (!value || typeof value !== 'object') throw new Error('invalid-statistics');
    const stats = value as Record<string, unknown>;
    return { total: count(stats.total), today: count(stats.today), yesterday: count(stats.yesterday) };
  };
  return { users: periods(data.users), games: { orel: periods(games?.orel), saper: periods(games?.saper) }, forum: { themes: periods(forum?.themes), comments: periods(forum?.comments) }, transfers: periods(data.transfers), exchange: periods(data.exchange) };
}
export async function getStatistics() { return decodeStatistics((await apiClient.get(config.makeApiUrl('v1/stat'))).data); }

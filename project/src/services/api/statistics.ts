import { apiClient } from '@/services/httpClient';
import config from '@/config/config';

export interface PeriodStats { total: number; today: number | null; yesterday: number | null; }
export interface Statistics {
  users: PeriodStats;
  games: { orel: PeriodStats; saper: PeriodStats };
  forum: { themes: PeriodStats; comments: PeriodStats };
  transfers: PeriodStats | null;
  exchange: PeriodStats;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid-statistics');
  return value as Record<string, unknown>;
}

function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('invalid-statistics');
  return value;
}

function periods(value: unknown): PeriodStats {
  // Older servers only know the total. Missing daily counts must not look like measured zeroes.
  if (typeof value === 'number') return { total: count(value), today: null, yesterday: null };
  const stats = record(value);
  const result = { total: count(stats.total), today: count(stats.today), yesterday: count(stats.yesterday) };
  if (result.today + result.yesterday > result.total) throw new Error('invalid-statistics');
  return result;
}

export function decodeStatistics(raw: unknown): Statistics {
  const data = record(raw);
  if ('errors' in data) throw new Error('invalid-statistics');
  const source = 'periods' in data ? record(data.periods) : data;
  const games = record(source.games);
  const forum = record(source.forum);
  return {
    users: periods(source.users),
    games: { orel: periods(games.orel), saper: periods(games.saper) },
    forum: { themes: periods(forum.themes), comments: periods(forum.comments) },
    transfers: 'transfers' in source ? periods(source.transfers) : null,
    exchange: periods(source.exchange),
  };
}

export async function getStatistics(): Promise<Statistics> {
  return decodeStatistics((await apiClient.get(config.makeApiUrl('v1/stat'))).data);
}

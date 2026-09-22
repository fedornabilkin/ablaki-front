import { apiClient } from '@/services/httpClient';
import config from '@/config/config';

export interface PeriodStats { total: number; today: number | null; yesterday: number | null; }
export interface StatPoint { date: string; value: number; }
export type ChartKind = 'users' | 'games' | 'forum' | 'transfers' | 'exchange';
export interface Statistics {
  users: PeriodStats;
  games: { orel: PeriodStats; saper: PeriodStats };
  forum: { themes: PeriodStats; comments: PeriodStats; credits?: PeriodStats | null };
  transfers: PeriodStats | null;
  exchange: PeriodStats;
  visitorsToday?: number | null;
  charts?: Partial<Record<ChartKind, StatPoint[]>>;
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
  const charts: Statistics['charts'] = {};
  if (data.charts !== undefined) {
    const rawCharts = record(data.charts);
    for (const key of ['users', 'games', 'forum', 'transfers', 'exchange'] as const) {
      const points = rawCharts[key];
      if (!Array.isArray(points) || points.length !== 7) throw new Error('invalid-statistics');
      charts[key] = points.map(value => {
        const point = record(value);
        if (typeof point.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(point.date)) throw new Error('invalid-statistics');
        return { date: point.date, value: count(point.value) };
      });
    }
  }
  return {
    users: periods(source.users),
    games: { orel: periods(games.orel), saper: periods(games.saper) },
    forum: { themes: periods(forum.themes), comments: periods(forum.comments), ...(forum.credits != null ? { credits: periods(forum.credits) } : {}) },
    transfers: 'transfers' in source ? periods(source.transfers) : null,
    exchange: periods(source.exchange),
    ...(data.visitors_today !== undefined ? { visitorsToday: count(data.visitors_today) } : {}),
    ...(data.charts !== undefined ? { charts } : {}),
  };
}

export async function getStatistics(): Promise<Statistics> {
  return decodeStatistics((await apiClient.get(config.makeApiUrl('v1/stat'))).data);
}

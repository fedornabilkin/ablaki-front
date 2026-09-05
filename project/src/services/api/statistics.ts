import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
export interface Statistics { users: number; games: { orel: number; saper: number }; forum: { themes: number; comments: number }; exchange: number; }
export function decodeStatistics(raw: unknown): Statistics {
  if (!raw || typeof raw !== 'object') throw new Error('invalid-statistics');
  const data = raw as Record<string, unknown>;
  const games = data.games as Record<string, unknown> | undefined;
  const forum = data.forum as Record<string, unknown> | undefined;
  const count = (value: unknown) => {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('invalid-statistics');
    return value;
  };
  return { users: count(data.users), games: { orel: count(games?.orel), saper: count(games?.saper) }, forum: { themes: count(forum?.themes), comments: count(forum?.comments) }, exchange: count(data.exchange) };
}
export async function getStatistics() { return decodeStatistics((await apiClient.get(config.makeApiUrl('v1/stat'))).data); }

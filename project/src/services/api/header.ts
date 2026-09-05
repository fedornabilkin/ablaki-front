import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { record } from '@/services/api/portal';

export interface OnlineCount { count: number; windowSeconds: number; }
export interface Tip { id: number; title: string; }
const url = (path: string) => config.makeApiUrl(`v1/${path}`);
export function parseOnlineCount(data: unknown): OnlineCount {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid-response');
  const value = data as Record<string, unknown>;
  if (!Number.isSafeInteger(value.count) || Number(value.count) < 0 || !Number.isSafeInteger(value.windowSeconds) || Number(value.windowSeconds) < 1) throw new Error('invalid-response');
  return { count: Number(value.count), windowSeconds: Number(value.windowSeconds) };
}
export async function onlineCount(): Promise<OnlineCount> {
  return parseOnlineCount((await apiClient.get(url('users/online-count'))).data);
}
export async function heartbeat(): Promise<OnlineCount> {
  return parseOnlineCount((await apiClient.post(url('users/heartbeat'))).data);
}
export function parseTip(data: unknown): Tip | null {
  if (data === null) return null;
  const value = record(data);
  if (typeof value.title !== 'string' || !value.title.trim()) throw new Error('invalid-response');
  return { id: value.id, title: value.title.trim() };
}
export async function randomTip(): Promise<Tip | null> {
  return parseTip((await apiClient.get(url('tips/random'))).data);
}
export function formatAccountNumber(value: unknown): string {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '' || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(Number(value));
}

/** Visibility/activity is supplied by the owning component; failures also respect the rate limit. */
export function createPresenceHeartbeat(send: () => Promise<unknown>, now: () => number = Date.now) {
  let lastSent = Number.NEGATIVE_INFINITY;
  let pending = false;
  return async (enabled: boolean): Promise<boolean> => {
    const current = now();
    if (!enabled || pending || current - lastSent < 60_000) return false;
    lastSent = current; pending = true;
    try { await send(); return true; }
    finally { pending = false; }
  };
}

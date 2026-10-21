import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record } from './world';
import { parseHealth } from './worldMvp';
function window(value: unknown) {
  if (value === null) return null;
  const r = record(value);
  if (!['breakfast', 'lunch', 'dinner'].includes(String(r.code)) || typeof r.name !== 'string' || r.name.length > 120) throw new Error('invalid-world-response');
  const startsAt = integer(r.starts_at), endsAt = integer(r.ends_at);
  if (endsAt <= startsAt) throw new Error('invalid-world-response');
  return { code: String(r.code), name: r.name, startsAt, endsAt };
}
export function parseKitchen(value: unknown) {
  const row = record(value), meal = record(row.meal);
  if (typeof row.meal_used !== 'boolean' || meal.timezone !== 'Europe/Moscow') throw new Error('invalid-world-response');
  return { nodeId: integer(row.node_id, 1, 2147483647), current: window(meal.current), next: window(meal.next), used: row.meal_used,
    health: parseHealth(row.health), serverTime: integer(row.server_time) };
}
export async function loadKitchen(node: number) { return parseKitchen((await apiClient.get(config.makeApiUrl(`v1/world/economy/kitchen/${node}`))).data); }

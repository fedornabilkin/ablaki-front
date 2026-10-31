import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record } from './world';

export interface CharacterLocation { node_id: number | null; revision: number }
const url = (node: number) => config.makeApiUrl(`v1/world/nodes/${integer(node, 1)}/presence`);
function location(value: unknown): CharacterLocation {
  const row = record(value);
  return { node_id: row.node_id === null ? null : integer(row.node_id, 1), revision: integer(row.revision) };
}
export async function loadPresence(node: number, signal?: AbortSignal) {
  const row = record((await apiClient.get(url(node), { signal })).data);
  if (typeof row.enabled !== 'boolean' || !Array.isArray(row.items)) throw new Error('invalid-presence-response');
  const counts: Record<number, number> = {};
  for (const value of row.items) { const item = record(value); counts[integer(item.node_id, 1)] = integer(item.count); }
  return { enabled: row.enabled, current: location(row.current), counts };
}
export async function visitNode(node: number, revision: number, heartbeat: boolean, signal?: AbortSignal) {
  const key = crypto.randomUUID();
  return location(record((await apiClient.post(url(node), { revision, heartbeat, request_key: key }, { signal })).data).current);
}

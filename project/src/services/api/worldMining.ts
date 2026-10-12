import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { record } from './world';
export interface MiningState { node_id: number; ready: boolean; working: boolean; workers: number; produced_quantity: number; pending_quantity: number; seconds_per_unit: number; server_time: number }
export function parseMining(value: unknown): MiningState {
  const row = record(value);
  const integer = (key: string) => { const value = row[key]; if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('invalid-world-response'); return value; };
  if (typeof row.ready !== 'boolean' || typeof row.working !== 'boolean') throw new Error('invalid-world-response');
  return { node_id: integer('node_id'), ready: row.ready, working: row.working, workers: integer('workers'), produced_quantity: integer('produced_quantity'), pending_quantity: integer('pending_quantity'), seconds_per_unit: integer('seconds_per_unit'), server_time: integer('server_time') };
}
export async function loadMining(id: number) { return parseMining((await apiClient.get(config.makeApiUrl(`v1/world/objects/${id}/mining`))).data); }

import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { record } from './world';
export interface SourceAction { code: string; work_seconds: number; cooldown_seconds: number; available_at?: number; experience?: number; output: { code: string; name: string; quantity: number }[]; tools: string[]; tool_names?: string[]; daily_limit: number | null }
export interface MiningState { node_id: number; ready: boolean; working: boolean; workers: number; produced_quantity: number; pending_quantity: number; seconds_per_unit: number; server_time: number;
  actions?: SourceAction[]; worked_seconds?: number; action_code?: string | null; output_storage_id?: number | null; blocked_message?: string | null; quota?: { maximum: number; remaining: number; restores_at: number } }
export function parseMining(value: unknown): MiningState {
  const row = record(value);
  const integer = (key: string) => { const value = row[key]; if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('invalid-world-response'); return value; };
  if (typeof row.ready !== 'boolean' || typeof row.working !== 'boolean') throw new Error('invalid-world-response');
  const uint = (value: unknown): number => { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('invalid-world-response'); return value; };
  const string = (value: unknown): string => { if (typeof value !== 'string' || value.length > 500) throw new Error('invalid-world-response'); return value; };
  let actions: SourceAction[] | undefined;
  if (row.actions !== undefined) {
    if (!Array.isArray(row.actions) || row.actions.length > 100) throw new Error('invalid-world-response');
    actions = row.actions.map(value => {
      const action = record(value);
      if (!Array.isArray(action.output) || action.output.length > 10 || !Array.isArray(action.tools) || action.tools.length > 10) throw new Error('invalid-world-response');
      return { code: string(action.code), work_seconds: uint(action.work_seconds), cooldown_seconds: uint(action.cooldown_seconds),
        ...(action.available_at === undefined ? {} : { available_at: uint(action.available_at) }),
        ...(action.experience === undefined ? {} : { experience: uint(action.experience) }),
        output: action.output.map(value => { const item = record(value); return { code: string(item.code), name: string(item.name), quantity: uint(item.quantity) }; }),
        tools: action.tools.map(string), ...(action.tool_names === undefined ? {} : { tool_names: (() => { if (!Array.isArray(action.tool_names) || action.tool_names.length !== action.tools.length) throw new Error('invalid-world-response'); return action.tool_names.map(string); })() }), daily_limit: action.daily_limit === null ? null : uint(action.daily_limit) };
    });
  }
  const quota = row.quota === undefined || row.quota === null ? undefined : record(row.quota);
  return { node_id: integer('node_id'), ready: row.ready, working: row.working, workers: integer('workers'), produced_quantity: integer('produced_quantity'), pending_quantity: integer('pending_quantity'), seconds_per_unit: integer('seconds_per_unit'), server_time: integer('server_time'),
    ...(actions ? { actions, worked_seconds: uint(row.worked_seconds), action_code: row.action_code === null ? null : string(row.action_code), blocked_message: row.blocked_message === null ? null : string(row.blocked_message) } : {}),
    ...(row.output_storage_id === undefined ? {} : { output_storage_id: row.output_storage_id === null ? null : uint(row.output_storage_id) }),
    ...(quota ? { quota: { maximum: uint(quota.maximum), remaining: uint(quota.remaining), restores_at: uint(quota.restores_at) } } : {}) };
}
export async function loadMining(id: number) { return parseMining((await apiClient.get(config.makeApiUrl(`v1/world/objects/${id}/mining`))).data); }

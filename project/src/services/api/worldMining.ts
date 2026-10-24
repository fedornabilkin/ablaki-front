import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { record } from './world';
export interface SourceAction { code: string; work_seconds: number; cooldown_seconds: number; available_at?: number; experience?: number; unavailable_reason?: string | null; output: { code: string; name: string; quantity: number }[]; tools: string[]; tool_names?: string[]; daily_limit: number | null }
export interface MineEmployment { enabled: boolean; reward_cr: string; storage_id: number | null; owner: boolean; available: boolean; reason: string | null; accepted_reward_cr: string | null; storages: { id: number; name: string; capacity: number }[] }
export interface MiningState { node_id: number; ready: boolean; working: boolean; workers: number; produced_quantity: number; pending_quantity: number; seconds_per_unit: number; server_time: number;
  work_id?: number | null; required_seconds?: number; live_work?: { accounted_at: number; last_seen_at: number }[];
  employment?: MineEmployment; unavailable_reason?: string | null;
  output_storages?: { id: number; name: string; kind: 'backpack' | 'stockpile'; capacity: number }[];
  output_destination?: 'backpack' | 'mini_storage' | null;
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
        ...(action.unavailable_reason === undefined ? {} : { unavailable_reason: action.unavailable_reason === null ? null : string(action.unavailable_reason) }),
        ...(action.available_at === undefined ? {} : { available_at: uint(action.available_at) }),
        ...(action.experience === undefined ? {} : { experience: uint(action.experience) }),
        output: action.output.map(value => { const item = record(value); return { code: string(item.code), name: string(item.name), quantity: uint(item.quantity) }; }),
        tools: action.tools.map(string), ...(action.tool_names === undefined ? {} : { tool_names: (() => { if (!Array.isArray(action.tool_names) || action.tool_names.length !== action.tools.length) throw new Error('invalid-world-response'); return action.tool_names.map(string); })() }), daily_limit: action.daily_limit === null ? null : uint(action.daily_limit) };
    });
  }
  let employment: MineEmployment | undefined;
  if (row.employment != null) {
    const p = record(row.employment);
    const boolean = (value: unknown): boolean => { if (typeof value !== 'boolean') throw new Error('invalid-world-response'); return value; };
    const money = (value: unknown): string => { const result = string(value); if (!/^\d+(\.\d{1,4})?$/.test(result)) throw new Error('invalid-world-response'); return result; };
    if (!Array.isArray(p.storages) || p.storages.length > 1000) throw new Error('invalid-world-response');
    employment = { enabled: boolean(p.enabled), reward_cr: money(p.reward_cr), storage_id: p.storage_id == null ? null : uint(p.storage_id), owner: boolean(p.owner), available: boolean(p.available), reason: p.reason == null ? null : string(p.reason), accepted_reward_cr: p.accepted_reward_cr == null ? null : money(p.accepted_reward_cr), storages: p.storages.map(value => { const s = record(value); return {id: uint(s.id), name: string(s.name), capacity: uint(s.capacity)}; }) };
  }
  let outputStorages: MiningState['output_storages'];
  if (row.output_storages !== undefined) {
    if (!Array.isArray(row.output_storages) || row.output_storages.length > 1000) throw new Error('invalid-world-response');
    outputStorages = row.output_storages.map(value => { const s = record(value); if (s.kind !== 'backpack' && s.kind !== 'stockpile') throw new Error('invalid-world-response'); const id = uint(s.id); if (!id) throw new Error('invalid-world-response'); return {id, name: string(s.name), kind: s.kind as 'backpack' | 'stockpile', capacity: uint(s.capacity)}; });
    if (new Set(outputStorages.map(s => s.id)).size !== outputStorages.length) throw new Error('invalid-world-response');
  }
  const quota = row.quota === undefined || row.quota === null ? undefined : record(row.quota);
  if (row.output_destination !== undefined && row.output_destination !== null && row.output_destination !== 'backpack' && row.output_destination !== 'mini_storage') throw new Error('invalid-world-response');
  return { ...(employment ? {employment} : {}), node_id: integer('node_id'), ready: row.ready, working: row.working, workers: integer('workers'), produced_quantity: integer('produced_quantity'), pending_quantity: integer('pending_quantity'), seconds_per_unit: integer('seconds_per_unit'), server_time: integer('server_time'),
    ...(row.unavailable_reason === undefined ? {} : { unavailable_reason: row.unavailable_reason === null ? null : string(row.unavailable_reason) }),
    ...(row.worked_seconds === undefined ? {} : { worked_seconds: uint(row.worked_seconds) }),
    ...(row.work_id === undefined ? {} : { work_id: row.work_id === null ? null : uint(row.work_id) }),
    ...(row.required_seconds === undefined ? {} : { required_seconds: uint(row.required_seconds) }),
    ...(row.live_work === undefined ? {} : { live_work: (() => { if (!Array.isArray(row.live_work) || row.live_work.length > 1000) throw new Error('invalid-world-response'); return row.live_work.map(value => { const worker = record(value); return { accounted_at: uint(worker.accounted_at), last_seen_at: uint(worker.last_seen_at) }; }); })() }),
    ...(actions ? { actions, worked_seconds: uint(row.worked_seconds), action_code: row.action_code === null ? null : string(row.action_code), blocked_message: row.blocked_message === null ? null : string(row.blocked_message) } : {}),
    ...(row.output_storage_id === undefined ? {} : { output_storage_id: row.output_storage_id === null ? null : uint(row.output_storage_id) }),
    ...(outputStorages ? { output_storages: outputStorages } : {}),
    ...(row.output_destination === undefined ? {} : { output_destination: row.output_destination as MiningState['output_destination'] }),
    ...(quota ? { quota: { maximum: uint(quota.maximum), remaining: uint(quota.remaining), restores_at: uint(quota.restores_at) } } : {}) };
}
export async function loadMining(id: number) { return parseMining((await apiClient.get(config.makeApiUrl(`v1/world/objects/${id}/mining`))).data); }

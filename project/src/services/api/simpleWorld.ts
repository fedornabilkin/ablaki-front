import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { record } from './world';

export interface SimpleNode { id: number; parent_id: number | null; name: string; hierarchy_level: number; node_type: string; building_kind: string | null; owner_user_id: number | null; status: string; revision: number }
export interface Build { id: number; node_id: number; owner_user_id: number; status: string; required_seconds: number; worked_seconds: number; labor_budget: string; job_kind?: string; initial_condition?: number; max_condition?: number; condition?: number; funding_node_id?: number; budget_available?: string; world_time_rate?: number; server_time?: number; live_work?: { accounted_at: number; last_seen_at: number }[] }
export interface Template { id: number; name: string; description?: string; build_seconds: number; material_summary: string; kind?: string; available?: boolean; unavailable_reason?: string; world_build_seconds?: number; world_time_rate?: number; economy?: { profile_version: number; price_cr: string; terms_digest: string } }
const number = (value: unknown): number => {
  const result = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof result !== 'number' || !Number.isSafeInteger(result) || result < 0) throw new Error('invalid-world-response');
  return result;
};
const text = (value: unknown): string => { if (typeof value !== 'string') throw new Error('invalid-world-response'); return value; };
export function node(value: unknown): SimpleNode {
  const row = record(value);
  return { id: number(row.id), parent_id: row.parent_id === null ? null : number(row.parent_id), name: text(row.name), hierarchy_level: number(row.hierarchy_level),
    node_type: text(row.node_type), building_kind: row.building_kind === null ? null : text(row.building_kind), owner_user_id: row.owner_user_id === null ? null : number(row.owner_user_id), status: text(row.status), revision: number(row.revision) };
}
export function build(value: unknown): Build {
  const row = record(value);
  return { id: number(row.id), node_id: number(row.node_id), owner_user_id: number(row.owner_user_id), status: text(row.status),
    required_seconds: number(row.required_seconds), worked_seconds: number(row.worked_seconds), labor_budget: money(row.labor_budget),
    ...(row.job_kind === undefined ? {} : { job_kind: text(row.job_kind), initial_condition: number(row.initial_condition) }),
    ...(row.max_condition === undefined ? {} : { max_condition: number(row.max_condition), condition: number(row.condition) }),
    ...(row.funding_node_id === undefined ? {} : { funding_node_id: number(row.funding_node_id), budget_available: money(row.budget_available) }),
    ...(row.world_time_rate === undefined ? {} : { world_time_rate: number(row.world_time_rate) }),
    ...(row.server_time === undefined ? {} : { server_time: number(row.server_time) }),
    ...(row.live_work === undefined ? {} : { live_work: parseLiveWork(row.live_work) }) };
}
function parseLiveWork(value: unknown): { accounted_at: number; last_seen_at: number }[] {
  if (!Array.isArray(value) || value.length > 1000) throw new Error('invalid-world-response');
  return value.map(value => { const row = record(value); return { accounted_at: number(row.accounted_at), last_seen_at: number(row.last_seen_at) }; });
}
function page<T>(value: unknown, parse: (value: unknown) => T) {
  const row = record(value), meta = record(row._meta);
  if (!Array.isArray(row.items) || row.items.length > 100) throw new Error('invalid-world-response');
  return { items: row.items.map(parse), total: number(meta.totalCount), pageSize: number(meta.perPage) };
}
const url = (path: string) => config.makeApiUrl(`v1/world/${path}`);
export async function objects(params: Record<string, unknown>) { return page((await apiClient.get(url('objects'), { params: { envelope: 1, ...params } })).data, node); }
export async function object(id: number) { return node((await apiClient.get(url(`objects/${id}`))).data); }
export async function builds(params: Record<string, unknown>) { return page((await apiClient.get(url('builds'), { params: { envelope: 1, ...params } })).data, build); }
export async function templates(parent: number) {
  const parse = (value: unknown): Template => {
    const row = record(value);
    if (row.available !== undefined && typeof row.available !== 'boolean') throw new Error('invalid-world-response');
    const economy = row.economy === undefined || row.economy === null ? undefined : record(row.economy);
    if (economy && (typeof economy.terms_digest !== 'string' || !/^[a-f0-9]{64}$/.test(economy.terms_digest))) throw new Error('invalid-world-response');
    return { id: number(row.id), name: text(row.name), ...(row.description == null ? {} : { description: text(row.description) }), build_seconds: number(row.build_seconds), material_summary: text(row.material_summary), ...(row.kind === undefined ? {} : { kind: text(row.kind) }),
      ...(row.available === undefined ? {} : { available: row.available as boolean, unavailable_reason: text(row.unavailable_reason) }),
      ...(row.world_build_seconds === undefined ? {} : { world_build_seconds: number(row.world_build_seconds), world_time_rate: number(row.world_time_rate) }),
      ...(economy ? { economy: { profile_version: number(economy.profile_version), price_cr: money(economy.price_cr), terms_digest: text(economy.terms_digest) } } : {}) };
  };
  const result: Template[] = [];
  for (let current = 1; current <= 100; current++) {
    const catalog = page((await apiClient.get(url('templates'), { params: { parent_id: parent, envelope: 1, page: current, 'per-page': 100 } })).data, parse);
    if (!catalog.pageSize || !catalog.items.length && result.length < catalog.total) throw new Error('invalid-world-response');
    result.push(...catalog.items);
    if (result.length >= catalog.total) {
      if (result.length !== catalog.total || new Set(result.map(item => item.id)).size !== result.length) throw new Error('invalid-world-response');
      return result;
    }
  }
  throw new Error('invalid-world-response');
}
export async function command(path: string, body: Record<string, unknown>, key: string) {
  return record((await apiClient.post(url(path), body, { headers: { 'Idempotency-Key': key } })).data);
}
export async function startState() {
  const row = record((await apiClient.get(url('start'))).data);
  return row.node === null ? null : node(row.node);
}
export async function activeBuild() {
  const row = record((await apiClient.get(url('builds/active'))).data);
  return row.build === null ? null : build(row.build);
}
export async function gatherState(id: number) {
  const row = record((await apiClient.get(url(`objects/${id}/gather`))).data);
  if (typeof row.gather_available !== 'boolean') throw new Error('invalid-world-response');
    if (row.gather_exhausted !== undefined && typeof row.gather_exhausted !== 'boolean') throw new Error('invalid-world-response');
    return { gather_available: row.gather_available, gather_available_at: number(row.gather_available_at), server_time: number(row.server_time),
      ...(row.gather_remaining === undefined ? {} : { gather_remaining: number(row.gather_remaining) }),
      ...(row.gather_limit === undefined ? {} : { gather_limit: number(row.gather_limit) }),
      ...(row.gather_exhausted === undefined ? {} : { gather_exhausted: row.gather_exhausted }) };
}
function money(value: unknown): string {
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+(\.\d{1,4})?$/.test(String(value))) throw new Error('invalid-world-response');
  return String(value);
}
export async function budget(id: number) {
  const row = record((await apiClient.get(url(`objects/${id}/budget`))).data);
  return { available: money(row.available), reserved: money(row.reserved) };
}

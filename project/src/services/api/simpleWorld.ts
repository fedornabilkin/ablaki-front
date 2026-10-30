import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { record } from './world';

export interface SimpleNode { id: number; parent_id: number | null; name: string; hierarchy_level: number; node_type: string; building_kind: string | null; owner_user_id: number | null; status: string; revision: number }
export interface BuildResult { finished_at: number; participants: { user_id: number; name: string; owner: boolean; seconds: number; paid_cr: string }[]; labor_budget_cr: string; paid_cr: string; released_cr: string; object_price_cr: string; spent_cr: string; material_refund_percent: number }
export interface Build { result?: BuildResult; id: number; node_id: number; owner_user_id: number; status: string; required_seconds: number; worked_seconds: number; labor_budget: string; parent_id?: number; can_reduce_budget?: boolean; minimum_labor_budget?: string; builder_limit?: number | null; job_kind?: string; initial_condition?: number; max_condition?: number; condition?: number; funding_node_id?: number; budget_available?: string; world_time_rate?: number; server_time?: number; live_work?: { accounted_at: number; last_seen_at: number }[] }
export interface Template { id: number; name: string; description?: string; build_seconds: number; minimum_labor_budget?: string; material_summary: string; kind?: string; available?: boolean; unavailable_reason?: string; world_build_seconds?: number; world_time_rate?: number; economy?: { profile_version: number; price_cr: string; terms_digest: string } }
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
  if (row.can_reduce_budget !== undefined && typeof row.can_reduce_budget !== 'boolean') throw new Error('invalid-world-response');
  return { ...(row.parent_id == null ? {} : {parent_id: number(row.parent_id)}), ...(row.can_reduce_budget === undefined ? {} : {can_reduce_budget: row.can_reduce_budget}), id: number(row.id), node_id: number(row.node_id), owner_user_id: number(row.owner_user_id), status: text(row.status),
    required_seconds: number(row.required_seconds), worked_seconds: number(row.worked_seconds), labor_budget: money(row.labor_budget),
    ...(row.minimum_labor_budget === undefined ? {} : { minimum_labor_budget: money(row.minimum_labor_budget), builder_limit: row.builder_limit === null ? null : number(row.builder_limit) }),
    ...(row.job_kind === undefined ? {} : { job_kind: text(row.job_kind), initial_condition: number(row.initial_condition) }),
    ...(row.max_condition === undefined ? {} : { max_condition: number(row.max_condition), condition: number(row.condition) }),
    ...(row.funding_node_id === undefined ? {} : { funding_node_id: number(row.funding_node_id), budget_available: money(row.budget_available) }),
    ...(row.world_time_rate === undefined ? {} : { world_time_rate: number(row.world_time_rate) }),
    ...(row.server_time === undefined ? {} : { server_time: number(row.server_time) }),
    ...(row.live_work === undefined ? {} : { live_work: parseLiveWork(row.live_work) }),
    ...(row.result == null ? {} : { result: parseBuildResult(row.result) }) };
}
function parseBuildResult(value: unknown): BuildResult {
  const row = record(value);
  if (!Array.isArray(row.participants) || row.participants.length > 10000) throw new Error('invalid-world-response');
  const participants = row.participants.map(value => {
    const p = record(value);
    if (typeof p.owner !== 'boolean' || typeof p.name !== 'string' || p.name.length > 255) throw new Error('invalid-world-response');
    return {user_id: number(p.user_id), name: p.name, owner: p.owner, seconds: number(p.seconds), paid_cr: money(p.paid_cr)};
  });
  if (new Set(participants.map(p => p.user_id)).size !== participants.length || number(row.material_refund_percent) > 100) throw new Error('invalid-world-response');
  return { finished_at: number(row.finished_at), participants, labor_budget_cr: money(row.labor_budget_cr), paid_cr: money(row.paid_cr), released_cr: money(row.released_cr), object_price_cr: money(row.object_price_cr), spent_cr: money(row.spent_cr), material_refund_percent: number(row.material_refund_percent) };
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
      ...(row.minimum_labor_budget === undefined ? {} : { minimum_labor_budget: money(row.minimum_labor_budget) }),
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
export interface StarterFunding { amount_cr: string | null; available_places?: number; reserve_cr?: string; settlements?: {node_id: number; name: string; amount_cr: string; available_places: number}[]; status?: string; available?: boolean; message?: string; source_node_id?: number; destination_node_id?: number }
function funding(value: unknown): StarterFunding | null {
  if (value == null) return null;
  const row = record(value);
  if (row.available !== undefined && typeof row.available !== 'boolean') throw new Error('invalid-world-response');
  return { amount_cr: row.amount_cr === null ? null : money(row.amount_cr ?? row.amount), ...(row.available_places === undefined ? {} : {available_places: number(row.available_places)}), ...(row.reserve_cr === undefined ? {} : {reserve_cr: money(row.reserve_cr)}), ...(row.settlements === undefined ? {} : {settlements: (() => { if (!Array.isArray(row.settlements) || row.settlements.length > 1000) throw new Error('invalid-world-response'); return row.settlements.map(value => { const city = record(value); return {node_id: number(city.node_id), name: text(city.name), amount_cr: money(city.amount_cr), available_places: number(city.available_places)}; }); })()}), ...(row.status === undefined ? {} : {status: text(row.status)}), ...(row.available === undefined ? {} : {available: row.available}), ...(row.message === undefined ? {} : {message: text(row.message)}), ...(row.source_node_id === undefined ? {} : {source_node_id: number(row.source_node_id)}), ...(row.destination_node_id === undefined ? {} : {destination_node_id: number(row.destination_node_id)}) };
}
export async function startOverview(nodeId?: number) {
  const row = record((await apiClient.get(url('start'), {params: nodeId ? {node_id: nodeId} : {}})).data);
  return {node: row.node === null ? null : node(row.node), funding: funding(row.funding), starter_funding: funding(row.starter_funding)};
}
export async function activeBuild() {
  const row = record((await apiClient.get(url('builds/active'))).data);
  return row.build === null ? null : build(row.build);
}
export async function gatherState(id: number) {
  const row = record((await apiClient.get(url(`objects/${id}/gather`))).data);
  if (row.gather_can_claim !== undefined && typeof row.gather_can_claim !== 'boolean') throw new Error('invalid-world-response');
  if (typeof row.gather_available !== 'boolean') throw new Error('invalid-world-response');
  if (row.gather_exhausted !== undefined && typeof row.gather_exhausted !== 'boolean') throw new Error('invalid-world-response');
  if (row.gather_minimum !== undefined && typeof row.gather_minimum !== 'boolean') throw new Error('invalid-world-response');
  return { gather_can_claim: row.gather_can_claim ?? row.gather_available, gather_reason: row.gather_reason == null ? null : text(row.gather_reason), gather_items: Array.isArray(row.gather_items) ? row.gather_items.map(value => { const item = record(value); return { name: text(item.name), quantity: number(item.quantity) }; }) : [], gather_available: row.gather_available, gather_available_at: number(row.gather_available_at), server_time: number(row.server_time),
    ...(row.gather_remaining === undefined ? {} : { gather_remaining: number(row.gather_remaining) }),
    ...(row.gather_limit === undefined ? {} : { gather_limit: number(row.gather_limit) }),
    ...(row.gather_exhausted === undefined ? {} : { gather_exhausted: row.gather_exhausted }),
    ...(row.gather_minimum === undefined ? {} : { gather_minimum: row.gather_minimum }) };
}
function money(value: unknown): string {
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+(\.\d{1,4})?$/.test(String(value))) throw new Error('invalid-world-response');
  return String(value);
}
export async function budget(id: number) {
  const row = record((await apiClient.get(url(`objects/${id}/budget`))).data);
  return { available: money(row.available), reserved: money(row.reserved) };
}

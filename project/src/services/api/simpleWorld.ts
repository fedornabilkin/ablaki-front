import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { record } from './world';

export interface SimpleNode { id: number; parent_id: number | null; name: string; hierarchy_level: number; node_type: string; building_kind: string | null; owner_user_id: number | null; status: string; revision: number }
export interface Build { id: number; node_id: number; owner_user_id: number; status: string; required_seconds: number; worked_seconds: number; labor_budget: string }
export interface Template { id: number; name: string; build_seconds: number; material_summary: string }
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
    required_seconds: number(row.required_seconds), worked_seconds: number(row.worked_seconds), labor_budget: money(row.labor_budget) };
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
  return page((await apiClient.get(url('templates'), { params: { parent_id: parent, envelope: 1 } })).data, value => {
    const row = record(value);
    return { id: number(row.id), name: text(row.name), build_seconds: number(row.build_seconds), material_summary: text(row.material_summary) };
  }).items;
}
export async function command(path: string, body: Record<string, unknown>, key: string) {
  return record((await apiClient.post(url(path), body, { headers: { 'Idempotency-Key': key } })).data);
}
export async function startState() {
  const row = record((await apiClient.get(url('start'))).data);
  return row.node === null ? null : node(row.node);
}
function money(value: unknown): string {
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+(\.\d{1,4})?$/.test(String(value))) throw new Error('invalid-world-response');
  return String(value);
}
export async function budget(id: number) {
  const row = record((await apiClient.get(url(`objects/${id}/budget`))).data);
  return { available: money(row.available), reserved: money(row.reserved) };
}

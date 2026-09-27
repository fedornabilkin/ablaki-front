import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';
const invalid = (): never => { throw new Error('invalid-housing-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const bool = (value: unknown): boolean => typeof value === 'boolean' ? value : invalid();
const url = (node: number, action: string) => config.makeApiUrl(`v1/world/nodes/${id(node)}/${action}`);
export type HousingAction = 'lodge' | 'leave';
export function parseLodgingAssignment(value: unknown) {
  if (value === null) return null;
  const r = record(value);
  if (r.kind !== 'shelter' && r.kind !== 'house') invalid();
  return { kind: r.kind as 'shelter' | 'house', node_id: id(r.node_id), interval_id: id(r.interval_id), started_at: integer(r.started_at) };
}
export async function loadHousing(node: number) {
  const r = record((await apiClient.get(url(node, 'housing'))).data);
  if (id(r.node_id) !== node) invalid();
  const supported = bool(r.supported), active = bool(r.active), writable = bool(r.writable);
  let place = null, lodging = null;
  if (r.place !== null) { const p = record(r.place); place = { id: id(p.id), plot_id: id(p.plot_id), created_at: integer(p.created_at) }; }
  if (r.lodging !== null) { const l = record(r.lodging); lodging = { id: id(l.id), assigned_at: integer(l.assigned_at), protects_now: bool(l.protects_now) }; }
  const current = parseLodgingAssignment(r.current_assignment), serverTime = integer(r.server_time);
  if (supported !== Boolean(place) || (!supported && (active || writable || lodging !== null))) invalid();
  if (lodging && (!place || lodging.assigned_at < place.created_at || lodging.protects_now !== active || current?.kind !== 'house' || current.node_id !== node || current.interval_id !== lodging.id || current.started_at !== lodging.assigned_at)) invalid();
  if (current?.kind === 'house' && current.node_id === node && !lodging) invalid();
  return { supported, active, writable, place, lodging, current, nightsEnabled: bool(r.night_resolution_enabled), serverTime };
}
export async function previewHousing(node: number, action: HousingAction) {
  if (action !== 'lodge' && action !== 'leave') invalid();
  const quote = parseWorldQuote((await apiClient.post(url(node, `housing-${action}-preview`), {})).data), t = quote.terms;
  if (id(t.node_id) !== node || t.price !== '0.0000') invalid();
  id(t.place_id); id(t.plot_id); id(t.actor_id);
  if (action === 'lodge') { if (t.lodging_id !== null) invalid(); }
  else id(t.lodging_id);
  return { action, quote };
}

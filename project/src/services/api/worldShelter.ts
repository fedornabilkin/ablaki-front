import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';
import { parseLodgingAssignment } from './worldHousing';
const invalid = (): never => { throw new Error('invalid-shelter-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const bool = (value: unknown): boolean => typeof value === 'boolean' ? value : invalid();
const nullable = (value: unknown) => value === null ? null : integer(value);
const nullableId = (value: unknown) => value === null ? null : id(value);
const url = (node: number, action = 'shelter') => config.makeApiUrl(`v1/world/nodes/${id(node)}/${action}`);
export type ShelterAction = 'claim' | 'deploy' | 'fold' | 'lodge' | 'leave' | 'repair';
function parseRepair(value: unknown) {
  const r = record(value);
  if (r.version !== 1 || r.price !== '0.0000' || r.station !== null || !Array.isArray(r.tools) || r.tools.length || !Array.isArray(r.materials) || !r.materials.length || r.materials.length > 20 || !Array.isArray(r.recipes) || r.recipes.length !== 2 || !Array.isArray(r.reasons) || r.reasons.some(reason => typeof reason !== 'string' || !reason)) invalid();
  const recipes = r.recipes.map(value => { const recipe = record(value); return { id: id(recipe.id), code: recipe.code }; });
  if (recipes[0].code !== 'classic-plank' || recipes[1].code !== 'classic-rope') invalid();
  const before = integer(r.durability_before, 0, 100000), after = integer(r.durability_after, 1, 100000), restore = integer(r.restore, 0, 100000);
  if (after - before !== restore) invalid();
  const materials = r.materials.map(value => {
    const m = record(value), quantity = integer(m.quantity, 0, 20000), have = integer(m.have), full = integer(m.full_quantity, 1, 20000), available = bool(m.available);
    if (typeof m.name !== 'string' || !m.name.trim() || typeof m.icon !== 'string' || quantity !== Math.ceil(full * restore / after) || available !== (have >= quantity)) invalid();
    return { item_id: id(m.item_id), name: m.name, icon: m.icon, quantity, have, available };
  });
  const available = bool(r.available);
  if (new Set(materials.map(m => m.item_id)).size !== materials.length || available !== (restore > 0 && materials.every(m => m.available)) || available !== (r.reasons.length === 0)) invalid();
  return { before, after, restore, materials, available, reasons: r.reasons as string[] };
}
export function shelterInput(action: ShelterAction, value: unknown) {
  const r = record(value), direct_deploy = bool(r.direct_deploy), end_lodging = bool(r.end_lodging);
  if ((action !== 'claim' && direct_deploy) || (action !== 'fold' && end_lodging)) invalid();
  return { direct_deploy, end_lodging };
}
export async function loadShelter(node: number) {
  const r = record((await apiClient.get(url(node))).data);
  if (id(r.node_id) !== node) invalid();
  let deployment = null, lodging = null;
  if (r.deployment !== null) {
    const d = record(r.deployment);
    deployment = { id: id(d.id), node_id: id(d.node_id), plot_id: id(d.plot_id), started_at: integer(d.started_at), protected_until: integer(d.protected_until) };
    if (deployment.protected_until <= deployment.started_at) invalid();
  }
  if (r.lodging !== null) {
    if (!deployment) invalid();
    const l = record(r.lodging); lodging = { assigned_at: integer(l.assigned_at), protects_now: bool(l.protects_now) };
  }
  const claimed = bool(r.claimed), instance_id = nullableId(r.instance_id), inventory_id = nullableId(r.inventory_id), durability = nullable(r.durability), max_durability = nullable(r.max_durability), claimed_at = nullable(r.claimed_at);
  if ((!claimed && (instance_id !== null || deployment !== null || claimed_at !== null)) || (claimed && claimed_at === null) || (durability !== null && (max_durability === null || durability > max_durability))) invalid();
  return { claimed, claimed_at, instance_id, inventory_id, durability, max_durability, deployment, lodging, current_assignment: parseLodgingAssignment(r.current_assignment), writable: bool(r.writable), night_resolution_enabled: bool(r.night_resolution_enabled), server_time: integer(r.server_time) };
}
export async function previewShelter(node: number, action: ShelterAction, payload: unknown) {
  const input = shelterInput(action, payload);
  const quote = parseWorldQuote((await apiClient.post(url(node, `shelter-${action}-preview`), input)).data), terms = quote.terms;
  if (id(terms.node_id) !== node || terms.direct_deploy !== input.direct_deploy || terms.end_lodging !== input.end_lodging || terms.price !== '0.0000') invalid();
  id(terms.item_id); nullableId(terms.instance_id); nullableId(terms.deployment_id); nullableId(terms.lodging_id); nullableId(terms.protection_id);
  const position = terms.backpack_position === null ? null : integer(terms.backpack_position, 1, 50);
  if ((action === 'fold' || (action === 'claim' && !input.direct_deploy)) && position === null) invalid();
  const repair = action === 'repair' ? parseRepair(terms.repair) : null;
  return { action, input, quote, position, repair, endsLodging: action === 'fold' && terms.lodging_id !== null };
}

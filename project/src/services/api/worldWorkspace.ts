import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';
import { parseStorageHeader } from './worldStorage';

const invalid = (): never => { throw new Error('invalid-workspace-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const text = (value: unknown, max = 255) => typeof value === 'string' && value.length <= max ? value : invalid();
const boolean = (value: unknown) => typeof value === 'boolean' ? value : invalid();
const list = <T>(value: unknown, parse: (entry: unknown) => T, max = 100): T[] => Array.isArray(value) && value.length <= max ? value.map(parse) : invalid();
const reasons = (value: unknown) => list(value, entry => text(entry, 1000));
function unit(value: unknown) {
  const r = record(value);
  if (!['carried', 'outdoor', 'covered', 'indoor'].includes(String(r.exposure_class))) invalid();
  return { item_id: id(r.item_id), instance_id: id(r.instance_id), inventory_id: id(r.inventory_id), storage_id: id(r.storage_id), in_backpack: boolean(r.in_backpack), is_station: boolean(r.is_station),
    max_durability: integer(r.max_durability, 1), durability: integer(r.durability, 0, integer(r.max_durability, 1)), exposure_class: text(r.exposure_class, 16) };
}
export function parseWorkspace(value: unknown) {
  const r = record(value);
  const recipes = list(r.recipes, value => { const row = record(value); return { id: id(row.id), name: text(row.name, 120), icon: row.icon === undefined ? 'cube' : text(row.icon, 64), quantity: integer(row.quantity, 1, 1000), locked_reasons: reasons(row.locked_reasons), available: row.available === undefined ? false : boolean(row.available), availability_reasons: row.availability_reasons === undefined ? [] : reasons(row.availability_reasons) }; }, 2000);
  const equipment = list(r.equipment, value => { const row = record(value); const item = id(row.item_id), station = boolean(row.is_station), candidates = list(row.candidates, unit);
    if (candidates.some(candidate => candidate.item_id !== item || candidate.is_station !== station) || new Set(candidates.map(c => c.instance_id)).size !== candidates.length) invalid();
    return { item_id: item, name: text(row.name, 120), is_station: station, candidates };
  });
  const storages = list(r.storages, value => { const row = record(value); return { ...parseStorageHeader(row), output_allowed: boolean(row.output_allowed) }; }, 200);
  const recipe = r.recipe_id === null ? null : id(r.recipe_id);
  if (recipe !== null && !recipes.some(r => r.id === recipe)) invalid();
  if (new Set(recipes.map(r => r.id)).size !== recipes.length || new Set(equipment.map(e => e.item_id)).size !== equipment.length || new Set(storages.map(s => s.id)).size !== storages.length) invalid();
  return { node_id: id(r.node_id), name: text(r.name, 120), recipe_id: recipe, recipes, equipment, storages, writable: boolean(r.writable), server_time: integer(r.server_time) };
}
export interface WorkspaceInput { node_id: number; recipe_id: number; quantity: number; source_storage_ids: number[]; output_storage_id: number; equipment_instance_ids: number[] }
export function parseWorkspaceTerms(value: unknown) {
  const r = record(value), output = record(r.output);
  if (typeof r.price !== 'string' || !/^(0|[1-9]\d{0,8})\.0000$/.test(r.price) || r.currency !== 'Cr') invalid();
  return { price: r.price as string, experience: integer(r.experience, 0, 100000), reasons: reasons(r.reasons),
    materials: list(r.materials, value => { const m = record(value); return { item_id: id(m.item_id), name: text(m.name, 120), quantity: integer(m.quantity, 1), have: integer(m.have), available: boolean(m.available) }; }),
    equipment: list(r.equipment, value => ({ ...unit(value), wear: integer(record(value).wear) })),
    output: { item_id: id(output.item_id), name: text(output.name, 120), quantity: integer(output.quantity, 1, 100000), storage_id: id(output.storage_id), fits: boolean(output.fits) } };
}
const url = (path: string) => config.makeApiUrl(`v1/world/workspace${path}`);
export async function loadWorkspace(node: number, recipe?: number) { return parseWorkspace((await apiClient.get(url(''), { params: { node_id: id(node), ...(recipe === undefined ? {} : { recipe_id: id(recipe) }) } })).data); }
export async function previewWorkspace(input: WorkspaceInput) { const quote = parseWorldQuote((await apiClient.post(url('/preview'), input)).data); return { quote, terms: parseWorkspaceTerms(quote.terms) }; }

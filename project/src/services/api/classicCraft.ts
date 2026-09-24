import { isAxiosError } from 'axios';
import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { errorText } from './portal';

export interface CraftItem { id: number; code: string; name: string; description: string; category_id: number; kind: string; rarity: string; icon: string; stack_size: number; destroyable: number; active: number; use_xp: number; gather_quantity: number }
export interface CraftRecipe { id: number; code: string; name: string; description: string; category_id: number; item_id: number; station_id: number | null; output_quantity: number; cost_credits: number; experience: number; min_level: number; crafted: number; ingredients: {item_id: number; quantity: number}[]; tools: number[]; requires: number[]; locked_reasons: string[] }
export interface CraftSlot { id: number; item_id: number; quantity: number }
export interface CraftState { items: CraftItem[]; recipes: CraftRecipe[]; categories: {id: number; name: string; code: string; description: string}[]; stations: {id: number; name: string; item_id: number | null}[]; skills: {category_id: number; experience: number; level: number}[]; inventory: {item_id: number; quantity: number}[]; inventory_slots: CraftSlot[]; credit: number; charge_credits: boolean; starter_available: boolean; gather_available: boolean; slot_limit: number; slots_used: number }
export interface CraftEvent { id: number; action: string; item_id: number | null; recipe_id: number | null; quantity: number; credit_change: number; created_at: number }
export type CraftAction = 'craft' | 'starter' | 'gather' | 'use' | 'discard' | 'merge';
export interface CraftCommand { action: CraftAction; id: number; quantity: number; request_key: string; slot_id?: number; target_slot_id?: number }
const object = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('invalid-response'); return v as Record<string, unknown>; };
const str = (v: unknown): string => { if (typeof v !== 'string') throw Error('invalid-response'); return v.trim(); };
const num = (v: unknown, min = 0, integer = true): number => { if ((typeof v !== 'number' && typeof v !== 'string') || String(v).trim() === '') throw Error('invalid-response'); const n = Number(v); if (!Number.isFinite(n) || n < min || (integer && !Number.isSafeInteger(n))) throw Error('invalid-response'); return n; };
const nullable = (v: unknown) => v === null ? null : num(v, 1);
const bool = (v: unknown): boolean => { if (typeof v !== 'boolean') throw Error('invalid-response'); return v; };
const arr = <T>(v: unknown, parse: (entry: unknown) => T): T[] => { if (!Array.isArray(v) || v.length > 10000) throw Error('invalid-response'); return v.map(parse); };
export function parseCraftState(value: unknown): CraftState {
  const d = object(value);
  const state: CraftState = {
    items: arr(d.items, v => { const r = object(v); return { id: num(r.id, 1), code: str(r.code), name: str(r.name), description: str(r.description), category_id: num(r.category_id, 1), kind: str(r.kind), rarity: str(r.rarity), icon: str(r.icon), stack_size: num(r.stack_size, 1), destroyable: num(r.destroyable), active: num(r.active), use_xp: num(r.use_xp), gather_quantity: num(r.gather_quantity) }; }),
    recipes: arr(d.recipes, v => { const r = object(v); return { id: num(r.id, 1), code: str(r.code), name: str(r.name), description: str(r.description), category_id: num(r.category_id, 1), item_id: num(r.item_id, 1), station_id: nullable(r.station_id), output_quantity: num(r.output_quantity, 1), cost_credits: num(r.cost_credits), experience: num(r.experience), min_level: num(r.min_level, 1), crafted: num(r.crafted), ingredients: arr(r.ingredients, v => { const i = object(v); return {item_id: num(i.item_id, 1), quantity: num(i.quantity, 1)}; }), tools: arr(r.tools, v => num(v, 1)), requires: arr(r.requires, v => num(v, 1)), locked_reasons: arr(r.locked_reasons, str) }; }),
    categories: arr(d.categories, v => { const r = object(v); return {id: num(r.id, 1), name: str(r.name), code: str(r.code), description: r.description === undefined ? '' : str(r.description)}; }),
    stations: arr(d.stations, v => { const r = object(v); return {id: num(r.id, 1), name: str(r.name), item_id: nullable(r.item_id)}; }),
    skills: arr(d.skills, v => { const r = object(v); return {category_id: num(r.category_id, 1), experience: num(r.experience), level: num(r.level, 1)}; }),
    inventory: arr(d.inventory, v => { const r = object(v); return {item_id: num(r.item_id, 1), quantity: num(r.quantity)}; }),
    inventory_slots: arr(d.inventory_slots, v => { const r = object(v); return {id: num(r.id, 1), item_id: num(r.item_id, 1), quantity: num(r.quantity, 1)}; }),
    credit: num(d.credit, 0, false), charge_credits: d.charge_credits === undefined ? false : bool(d.charge_credits), starter_available: bool(d.starter_available), gather_available: bool(d.gather_available), slot_limit: num(d.slot_limit, 1), slots_used: num(d.slots_used),
  };
  for (const rows of [state.items, state.recipes, state.categories, state.stations, state.inventory_slots]) if (new Set(rows.map(r => r.id)).size !== rows.length) throw Error('invalid-response');
  const itemIds = new Set(state.items.map(i => i.id));
  for (const r of state.recipes) if (!itemIds.has(r.item_id) || r.ingredients.some(i => !itemIds.has(i.item_id)) || r.tools.some(id => !itemIds.has(id))) throw Error('invalid-response');
  if (state.inventory.some(i => !itemIds.has(i.item_id))) throw Error('invalid-response');
  if (state.inventory_slots.some(s => !itemIds.has(s.item_id)) || state.slots_used !== state.inventory_slots.length) throw Error('invalid-response');
  return state;
}
const url = (path = '') => config.makeApiUrl(`v1/craft${path}`);
export async function loadCraft(): Promise<CraftState> { return parseCraftState((await apiClient.get(url())).data); }
export async function sendCraft(command: CraftCommand): Promise<{state: CraftState; message: string}> {
  const d = object((await apiClient.post(url('/command'), command)).data);
  return { state: parseCraftState(d.state), message: str(d.message) };
}
export async function loadCraftHistory(page: number): Promise<{items: CraftEvent[]; pages: number}> {
  const d = object((await apiClient.get(url('/history'), {params: {page, 'per-page': 20, envelope: 1}})).data);
  const rows = arr(d.items, v => { const r = object(v); return {id: num(r.id, 1), action: str(r.action), item_id: nullable(r.item_id), recipe_id: nullable(r.recipe_id), quantity: num(r.quantity), credit_change: num(r.credit_change, -100000000), created_at: num(r.created_at)}; });
  return {items: rows, pages: num(object(d._meta).pageCount)};
}
export function craftError(cause: unknown): string {
  if (isAxiosError(cause) && [409, 422, 429, 503].includes(cause.response?.status ?? 0)) {
    const data = cause.response?.data;
    if (data && typeof data === 'object' && typeof data.message === 'string' && data.message.length < 500) return data.message;
  }
  return errorText(cause);
}

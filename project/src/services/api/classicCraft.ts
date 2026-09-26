import { isAxiosError } from 'axios';
import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { errorText } from './portal';

export interface CraftItem { id: number; code: string; name: string; description: string; category_id: number; kind: string; rarity: string; icon: string; stack_size: number; destroyable: number; active: number; use_xp: number; gather_quantity: number; storage_kind?: 'none' | 'chest' | 'elixir' }
export interface CraftRecipe { id: number; code: string; name: string; description: string; category_id: number; item_id: number; station_id: number | null; output_quantity: number; cost_credits: number; experience: number; min_level: number; crafted: number; ingredients: {item_id: number; quantity: number}[]; tools: number[]; requires: number[]; locked_reasons: string[] }
export interface CraftSlot { id: number; item_id: number; quantity: number; position?: number; active?: boolean }
export interface ChestRepair { materials: {item_id: number; quantity: number; have: number}[]; tools: {item_id: number; durability: number; max_durability: number}[]; station: {id: number; item_id: number | null; name: string} | null; reasons: string[]; restore: number }
export interface CraftContainer { id: number; capacity: number; durability: number; max_durability: number; slots: CraftSlot[]; repair?: ChestRepair }
export interface InventorySettings { slot_price: number; elixir_slots: number; elixir_days: number; chest_slots: number; chest_durability: number; chest_wear: number }
export interface CraftStorageState { containers?: CraftContainer[]; permanent_slots?: number; active_slots?: number; slots_expire_at?: number | null; inventory_settings?: InventorySettings; server_time?: number; gather_available_at?: number }
export interface CraftState extends CraftStorageState { items: CraftItem[]; recipes: CraftRecipe[]; categories: {id: number; name: string; code: string; description: string}[]; stations: {id: number; name: string; item_id: number | null}[]; skills: {category_id: number; experience: number; level: number}[]; inventory: {item_id: number; quantity: number}[]; inventory_slots: CraftSlot[]; credit: number; charge_credits: boolean; starter_available: boolean; gather_available: boolean; slot_limit: number; slots_used: number }
export interface CraftEvent { id: number; action: string; item_id: number | null; recipe_id: number | null; quantity: number; credit_change: number; created_at: number }
export type CraftAction = 'craft' | 'starter' | 'gather' | 'use' | 'discard' | 'merge' | 'transfer' | 'buy_slots' | 'repair';
export interface CraftCommand { action: CraftAction; id: number; quantity: number; request_key: string; slot_id?: number; target_slot_id?: number; container_id?: number; position?: number; unit_price?: number }
export type CraftInput = Omit<CraftCommand, 'request_key'>;
const object = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('invalid-response'); return v as Record<string, unknown>; };
const str = (v: unknown): string => { if (typeof v !== 'string') throw Error('invalid-response'); return v.trim(); };
const num = (v: unknown, min = 0, integer = true): number => { if ((typeof v !== 'number' && typeof v !== 'string') || String(v).trim() === '') throw Error('invalid-response'); const n = Number(v); if (!Number.isFinite(n) || n < min || (integer && !Number.isSafeInteger(n))) throw Error('invalid-response'); return n; };
const nullable = (v: unknown) => v === null ? null : num(v, 1);
const bool = (v: unknown): boolean => { if (typeof v !== 'boolean') throw Error('invalid-response'); return v; };
const arr = <T>(v: unknown, parse: (entry: unknown) => T): T[] => { if (!Array.isArray(v) || v.length > 10000) throw Error('invalid-response'); return v.map(parse); };
const storageKind = (v: unknown): CraftItem['storage_kind'] => { if (v === undefined) return 'none'; if (v !== 'none' && v !== 'chest' && v !== 'elixir') throw Error('invalid-response'); return v; };
const parseSlot = (value: unknown): CraftSlot => { const r = object(value); return {id: num(r.id, 1), item_id: num(r.item_id, 1), quantity: num(r.quantity, 1), ...(r.position === undefined ? {} : {position: num(r.position, 1)}), ...(r.active === undefined ? {} : {active: bool(r.active)})}; };
function parseRepair(value: unknown): ChestRepair {
  const r = object(value), station = r.station === null ? null : object(r.station);
  return {
    materials: arr(r.materials, value => { const v = object(value); return {item_id: num(v.item_id, 1), quantity: num(v.quantity), have: num(v.have)}; }),
    tools: arr(r.tools, value => { const v = object(value), durability = num(v.durability), maximum = num(v.max_durability, 1); if (durability > maximum) throw Error('invalid-response'); return {item_id: num(v.item_id, 1), durability, max_durability: maximum}; }),
    station: station && {id: num(station.id, 1), item_id: nullable(station.item_id), name: str(station.name)},
    reasons: arr(r.reasons, str), restore: num(r.restore),
  };
}
export function parseCraftState(value: unknown): CraftState {
  const d = object(value);
  const state: CraftState = {
    items: arr(d.items, v => { const r = object(v); return { id: num(r.id, 1), code: str(r.code), name: str(r.name), description: str(r.description), category_id: num(r.category_id, 1), kind: str(r.kind), rarity: str(r.rarity), icon: str(r.icon), stack_size: num(r.stack_size, 1), destroyable: num(r.destroyable), active: num(r.active), use_xp: num(r.use_xp), gather_quantity: num(r.gather_quantity) }; }),
    recipes: arr(d.recipes, v => { const r = object(v); return { id: num(r.id, 1), code: str(r.code), name: str(r.name), description: str(r.description), category_id: num(r.category_id, 1), item_id: num(r.item_id, 1), station_id: nullable(r.station_id), output_quantity: num(r.output_quantity, 1), cost_credits: num(r.cost_credits), experience: num(r.experience), min_level: num(r.min_level, 1), crafted: num(r.crafted), ingredients: arr(r.ingredients, v => { const i = object(v); return {item_id: num(i.item_id, 1), quantity: num(i.quantity, 1)}; }), tools: arr(r.tools, v => num(v, 1)), requires: arr(r.requires, v => num(v, 1)), locked_reasons: arr(r.locked_reasons, str) }; }),
    categories: arr(d.categories, v => { const r = object(v); return {id: num(r.id, 1), name: str(r.name), code: str(r.code), description: r.description === undefined ? '' : str(r.description)}; }),
    stations: arr(d.stations, v => { const r = object(v); return {id: num(r.id, 1), name: str(r.name), item_id: nullable(r.item_id)}; }),
    skills: arr(d.skills, v => { const r = object(v); return {category_id: num(r.category_id, 1), experience: num(r.experience), level: num(r.level, 1)}; }),
    inventory: arr(d.inventory, v => { const r = object(v); return {item_id: num(r.item_id, 1), quantity: num(r.quantity)}; }),
    inventory_slots: arr(d.inventory_slots, parseSlot),
    credit: num(d.credit, 0, false), charge_credits: d.charge_credits === undefined ? false : bool(d.charge_credits), starter_available: bool(d.starter_available), gather_available: bool(d.gather_available), slot_limit: num(d.slot_limit, 1), slots_used: num(d.slots_used),
  };
  state.items.forEach((item, index) => { const kind = object((d.items as unknown[])[index]).storage_kind; if (kind !== undefined) item.storage_kind = storageKind(kind); });
  if (d.gather_available_at !== undefined) state.gather_available_at = num(d.gather_available_at, 1);
  if (d.inventory_settings !== undefined) {
    const settings = object(d.inventory_settings);
    state.inventory_settings = Object.fromEntries(['slot_price','elixir_slots','elixir_days','chest_slots','chest_durability','chest_wear'].map(key => [key, num(settings[key])])) as unknown as InventorySettings;
    state.permanent_slots = num(d.permanent_slots, 20); state.active_slots = num(d.active_slots, state.permanent_slots);
    if (state.active_slots > 50 || state.inventory_settings.elixir_slots < 1 || state.inventory_settings.elixir_days < 1 || state.inventory_settings.chest_slots < 1 || state.inventory_settings.chest_slots > 100 || state.inventory_settings.chest_durability < 1) throw Error('invalid-response');
    state.slots_expire_at = nullable(d.slots_expire_at); state.server_time = num(d.server_time);
    state.containers = arr(d.containers, value => { const r = object(value); return {id: num(r.id, 1), capacity: num(r.capacity, 1), durability: num(r.durability), max_durability: num(r.max_durability, 1), slots: arr(r.slots, parseSlot), ...(r.repair === undefined ? {} : {repair: parseRepair(r.repair)})}; });
    const backpackIds = new Set(state.inventory_slots.map(slot => slot.id));
    const positions = new Set<number>();
    for (const slot of state.inventory_slots) {
      if (!slot.position || positions.has(slot.position) || slot.active !== (slot.position <= state.active_slots)) throw Error('invalid-response');
      positions.add(slot.position);
    }
    const ids = new Set(backpackIds);
    for (const container of state.containers) {
      const chest = state.inventory_slots.find(slot => slot.id === container.id);
      if (!backpackIds.has(container.id) || !chest || chest.quantity !== 1 || state.items.find(item => item.id === chest.item_id)?.storage_kind !== 'chest' || container.capacity > 100 || container.durability > container.max_durability) throw Error('invalid-response');
      const positions = new Set<number>();
      for (const slot of container.slots) { if (!slot.position || slot.position > container.capacity || positions.has(slot.position) || ids.has(slot.id) || !state.items.some(i => i.id === slot.item_id)) throw Error('invalid-response'); positions.add(slot.position); ids.add(slot.id); }
    }
    if (new Set(state.containers.map(c => c.id)).size !== state.containers.length) throw Error('invalid-response');
  }
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

import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';
import { parseRepair } from './classicCraft';
const kinds = ['backpack', 'chest', 'placement', 'recovery', 'stockpile'] as const;
export interface StorageHeader { id: number; kind: typeof kinds[number]; name: string; node_id: number | null; container_inventory_id: number | null; capacity: number; revision: number }
export interface EquipmentUnit { id: number; durability: number; max_durability: number; exposure_class: 'outdoor' | 'covered' | 'indoor' | 'carried' }
export interface StorageItem { id: number; item_id: number; name: string; icon: string; quantity: number; position: number; revision: number; instances: EquipmentUnit[]; inner_storage_id: number | null }
export interface StorageView { storage: StorageHeader; items: StorageItem[]; slots: { position: number; type: string; exposure_class: string; available: boolean }[]; container: { durability: number; max_durability: number } | null; location: { node_id: number; name: string } | null; total: number; currentPage: number; pageCount: number; pageSize: number; server_time: number; writable: boolean }
export interface TransferInput { inventory_id: number; source_storage_id: number; destination_storage_id: number; position: number; quantity: number; instance_id: number | null }
const invalid = (): never => { throw new Error('invalid-storage-response'); };
const text = (value: unknown, max = 255) => typeof value === 'string' && value.length <= max ? value : invalid();
const id = (value: unknown) => integer(value, 1, 2147483647);
const nullable = (value: unknown) => value === null ? null : id(value);
const list = <T>(value: unknown, parse: (entry: unknown) => T, max = 100): T[] => Array.isArray(value) && value.length <= max ? value.map(parse) : invalid();
const exposure = (value: unknown): EquipmentUnit['exposure_class'] => ['outdoor', 'covered', 'indoor', 'carried'].includes(String(value)) ? value as EquipmentUnit['exposure_class'] : invalid();
export function parseStorageHeader(value: unknown): StorageHeader {
  const r = record(value); if (!kinds.includes(r.kind as StorageHeader['kind'])) invalid();
  return { id: id(r.id), kind: r.kind as StorageHeader['kind'], name: text(r.name, 120), node_id: nullable(r.node_id), container_inventory_id: nullable(r.container_inventory_id), capacity: integer(r.capacity, 0, 10000), revision: id(r.revision) };
}
export function parseStorageView(value: unknown): StorageView {
  const r = record(value), meta = record(r._meta);
  const items = list(r.items, value => {
    const i = record(value);
    const instances = list(i.instances, value => { const e = record(value); return { id: id(e.id), max_durability: integer(e.max_durability, 1), durability: integer(e.durability, 0, integer(e.max_durability, 1)), exposure_class: exposure(e.exposure_class) }; }, 10000);
    const quantity = integer(i.quantity, 1); if (instances.length && instances.length !== quantity) invalid();
    return { id: id(i.id), item_id: id(i.item_id), name: text(i.name, 120), icon: text(i.icon, 64), quantity, position: id(i.position), revision: id(i.revision), instances, inner_storage_id: nullable(i.inner_storage_id) };
  });
  const slots = list(r.slots, value => { const s = record(value); if (typeof s.available !== 'boolean') invalid(); return { position: id(s.position), type: text(s.type, 24), exposure_class: exposure(s.exposure_class), available: s.available as boolean }; });
  const total = integer(meta.totalCount), pageSize = integer(meta.perPage, 1, 100), currentPage = integer(meta.currentPage, 1, 1000000), pageCount = integer(meta.pageCount);
  if (pageCount !== Math.ceil(total / pageSize) || items.length > pageSize || new Set(items.map(i => i.id)).size !== items.length || new Set(items.map(i => i.position)).size !== items.length) invalid();
  if (typeof r.writable !== 'boolean') invalid();
  const c = r.container === null ? null : record(r.container), l = r.location === null ? null : record(r.location);
  const container = c ? { durability: integer(c.durability, 0, integer(c.max_durability, 1)), max_durability: integer(c.max_durability, 1) } : null;
  const location = l ? { node_id: id(l.node_id), name: text(l.name, 120) } : null;
  return { storage: parseStorageHeader(r.storage), items, slots, container, location, total, pageSize, currentPage, pageCount, server_time: integer(r.server_time), writable: r.writable as boolean };
}
const url = (path: string) => config.makeApiUrl(`v1/world/${path}`);
export async function loadStorageList(node: number | null) { const r = record((await apiClient.get(url('storages'), { params: node === null ? {} : { node_id: id(node) } })).data); return list(r.items, parseStorageHeader, 200); }
export async function loadStorage(storage: number, page = 1) { return parseStorageView((await apiClient.get(url(`storage/${id(storage)}`), { params: { page } })).data); }
export async function previewTransfer(input: TransferInput) { return parseWorldQuote((await apiClient.post(url('storage/transfer-preview'), input)).data); }
export async function previewChestRepair(storage: number, container: number) {
  const quote = parseWorldQuote((await apiClient.post(url('storage/chest-repair-preview'), { storage_id: id(storage), container_inventory_id: id(container) })).data);
  return { quote, repair: parseRepair(quote.terms.repair) };
}
export async function loadRecovery(page: number) {
  const r = record((await apiClient.get(url('storage/recovery'), { params: { page: integer(page, 1, 1000000) } })).data), meta = record(r._meta);
  if (typeof r.writable !== 'boolean') invalid();
  const items = list(r.items, value => { const i = record(value); return { inventory_id: id(i.inventory_id), name: text(i.name, 120), quantity: integer(i.quantity, 1), node_id: id(i.node_id) }; }, 50);
  const total = integer(meta.totalCount), pageSize = integer(meta.perPage, 50, 50), currentPage = integer(meta.currentPage, 1, 1000000);
  if (integer(meta.pageCount) !== Math.ceil(total / pageSize) || new Set(items.map(i => i.inventory_id)).size !== items.length) invalid();
  return { items, total, pageSize, currentPage, recovery_storage_id: nullable(r.recovery_storage_id), writable: r.writable as boolean };
}
export async function previewRecovery(inventory: number) {
  const quote = parseWorldQuote((await apiClient.post(url('storage/recovery-preview'), { inventory_id: id(inventory) })).data), terms = quote.terms;
  if (terms.contents_preserved !== true || id(terms.inventory_id) !== inventory) invalid();
  return { quote, inventory_id: inventory, name: text(terms.name, 120), quantity: integer(terms.quantity, 1) };
}

import type { StorageItem, StorageView, TransferInput } from '@/services/api/worldStorage';
import type { MapBounds, WorldMapData } from './types';
import { mapPurchase } from './mapSelection';
import { occupiesCell } from './coordinates';

export interface StorageMapContext { bounds: MapBounds; map: WorldMapData }

function placementCell(context: StorageMapContext, position: number) {
  const point = { x: context.bounds.x + (position - 1) % context.bounds.width, y: context.bounds.y + Math.floor((position - 1) / context.bounds.width) };
  const state = context.map.cells.find(cell => cell.x === point.x && cell.y === point.y)?.state;
  const object = context.map.items.find(node => node.status !== 'archived' && occupiesCell(node, point));
  return { point, state, object };
}

export function storageCells(view: StorageView, page = 1, context?: StorageMapContext | null) {
  const count = Math.max(view.storage.capacity, ...view.items.map(item => item.position));
  const items = new Map(view.items.map(item => [item.position, item]));
  const slots = new Map(view.slots.map(slot => [slot.position, slot]));
  const start = (page - 1) * 100;
  return Array.from({ length: Math.max(0, Math.min(100, count - start)) }, (_, index) => {
    const position = start + index + 1;
    const mapped = view.storage.kind === 'placement' && context?.map.node_id === view.storage.node_id ? context : null;
    const { point = null, state, object } = mapped ? placementCell(mapped, position) : {};
    const purchase = state === 'discovered' && !object;
    const price = purchase && mapped?.map.pricing ? mapPurchase(mapped.map.pricing, [point!]).total : null;
    return { position, item: items.get(position), object, available: !object && !purchase && position <= view.storage.capacity && (view.storage.kind !== 'placement' || slots.get(position)?.available === true), exposure: slots.get(position)?.exposure_class, purchase, price, point, visible: !mapped || state !== undefined || !!object || items.has(position) };
  }).filter(cell => cell.visible);
}

export function storageTransfer(source: StorageView, item: StorageItem, target: StorageView, position: number, quantity: number, instance: number | null, context?: StorageMapContext | null): TransferInput | null {
  if (!source.writable || !target.writable || target.storage.kind === 'recovery' || !source.items.some(row => row.id === item.id)) return null;
  if (item.inner_storage_id && target.storage.kind === 'chest') return null;
  if (!Number.isSafeInteger(position) || position < 1 || position > target.storage.capacity || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > Math.min(item.quantity, 10000)) return null;
  if (instance !== null && (quantity !== 1 || !item.instances.some(unit => unit.id === instance))) return null;
  const occupied = target.items.find(row => row.position === position);
  if (occupied && (occupied.id === item.id || occupied.item_id !== item.item_id || occupied.inner_storage_id || item.inner_storage_id)) return null;
  if (target.storage.kind === 'placement' && (occupied || quantity !== 1 || !target.slots.some(slot => slot.position === position && slot.available))) return null;
  if (target.storage.kind === 'placement' && context?.map.node_id === target.storage.node_id) {
    const cell = placementCell(context, position);
    if (cell.object || cell.state !== 'open') return null;
  }
  return { inventory_id: item.id, source_storage_id: source.storage.id, destination_storage_id: target.storage.id, position, quantity, instance_id: instance };
}

/** Local projection only. Command revisions and inventory ownership remain server authoritative. */
export function optimisticTransfer(source: StorageView, target: StorageView, input: TransferInput): [StorageView, StorageView] {
  const views = new Map([source, target].map(view => [view.storage.id, { ...view, items: view.items.map(item => ({ ...item, instances: [...item.instances] })) }]));
  const from = views.get(source.storage.id)!, to = views.get(target.storage.id)!;
  const item = from.items.find(row => row.id === input.inventory_id);
  if (!item || input.quantity > item.quantity) throw new Error('storage-changed');
  const units = item.instances.filter(unit => input.instance_id === null || unit.id === input.instance_id).slice(0, input.quantity);
  const unitIds = new Set(units.map(unit => unit.id));
  const moved = { ...item, id: -item.id, position: input.position, quantity: input.quantity, instances: units };
  item.quantity -= input.quantity; item.instances = item.instances.filter(unit => !unitIds.has(unit.id));
  from.items = from.items.filter(row => row.quantity > 0);
  const existing = to.items.find(row => row.position === input.position);
  if (existing) { existing.quantity += moved.quantity; existing.instances.push(...moved.instances); }
  else to.items.push(moved);
  for (const view of views.values()) { view.items.sort((a, b) => a.position - b.position); view.total = view.items.length; }
  return [from, to];
}

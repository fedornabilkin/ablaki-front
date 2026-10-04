import type { StorageItem, StorageView, TransferInput } from '@/services/api/worldStorage';

export function storageCells(view: StorageView, page = 1) {
  const count = Math.max(view.storage.capacity, ...view.items.map(item => item.position));
  const items = new Map(view.items.map(item => [item.position, item]));
  const slots = new Map(view.slots.map(slot => [slot.position, slot]));
  const start = (page - 1) * 100;
  return Array.from({ length: Math.max(0, Math.min(100, count - start)) }, (_, index) => {
    const position = start + index + 1;
    return { position, item: items.get(position), available: position <= view.storage.capacity && (view.storage.kind !== 'placement' || slots.get(position)?.available === true), exposure: slots.get(position)?.exposure_class };
  });
}

export function storageTransfer(source: StorageView, item: StorageItem, target: StorageView, position: number, quantity: number, instance: number | null): TransferInput | null {
  if (!source.writable || !target.writable || target.storage.kind === 'recovery' || !source.items.some(row => row.id === item.id)) return null;
  if (item.inner_storage_id && target.storage.kind === 'chest') return null;
  if (!Number.isSafeInteger(position) || position < 1 || position > target.storage.capacity || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > Math.min(item.quantity, 10000)) return null;
  if (instance !== null && (quantity !== 1 || !item.instances.some(unit => unit.id === instance))) return null;
  const occupied = target.items.find(row => row.position === position);
  if (occupied && (occupied.id === item.id || occupied.item_id !== item.item_id || occupied.inner_storage_id || item.inner_storage_id)) return null;
  if (target.storage.kind === 'placement' && (occupied || quantity !== 1 || !target.slots.some(slot => slot.position === position && slot.available))) return null;
  return { inventory_id: item.id, source_storage_id: source.storage.id, destination_storage_id: target.storage.id, position, quantity, instance_id: instance };
}

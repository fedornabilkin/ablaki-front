import type { CraftSlot } from '@/services/api/classicCraft';
export const INVENTORY_CELLS = 100;
export function inventoryCells(slots: CraftSlot[]): (CraftSlot | null)[] {
  return Array.from({length: INVENTORY_CELLS}, (_, index) => slots[index] ?? null);
}
export function insideTrash(point: {x: number; y: number}, rect: {left: number; right: number; top: number; bottom: number}): boolean {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

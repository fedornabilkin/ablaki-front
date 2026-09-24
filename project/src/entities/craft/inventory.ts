import type { CraftSlot } from '@/services/api/classicCraft';
export const INVENTORY_CELLS = 50;
export function inventoryCells(slots: CraftSlot[], count = INVENTORY_CELLS): (CraftSlot | null)[] {
  const positions = new Map(slots.map((slot, index) => [slot.position ?? index + 1, slot]));
  return Array.from({length: count}, (_, index) => positions.get(index + 1) ?? null);
}
export function insideTrash(point: {x: number; y: number}, rect: {left: number; right: number; top: number; bottom: number}): boolean {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

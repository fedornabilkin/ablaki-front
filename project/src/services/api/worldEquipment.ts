import { integer, record } from './world';
export interface EquipmentRequirement { item_id: number; is_station: boolean; available: boolean; in_backpack: boolean; instance_id: number | null; durability: number; max_durability: number; wear_per_batch: number }
export function parseEquipmentRequirements(value: unknown): EquipmentRequirement[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error('invalid-equipment-response');
  const result = value.map(value => {
    const r = record(value);
    if (typeof r.is_station !== 'boolean' || typeof r.available !== 'boolean' || typeof r.in_backpack !== 'boolean') throw new Error('invalid-equipment-response');
    const maximum = integer(r.max_durability, 1);
    return { item_id: integer(r.item_id, 1), is_station: r.is_station, available: r.available, in_backpack: r.in_backpack, instance_id: r.instance_id === null ? null : integer(r.instance_id, 1), durability: integer(r.durability, 0, maximum), max_durability: maximum, wear_per_batch: integer(r.wear_per_batch, 0, 10000) };
  });
  if (new Set(result.map(r => r.item_id)).size !== result.length || result.some(r => r.available && (r.instance_id === null || r.durability < 1))) throw new Error('invalid-equipment-response');
  return result;
}

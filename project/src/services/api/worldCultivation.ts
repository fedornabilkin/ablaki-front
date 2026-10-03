import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';

export type CultivationAction = 'dig' | 'sow' | 'water' | 'harvest' | 'cancel';
const invalid = (): never => { throw new Error('invalid-cultivation-response'); };
const text = (value: unknown) => typeof value === 'string' && value.length <= 120 ? value : invalid();
const bool = (value: unknown) => typeof value === 'boolean' ? value : invalid();
const time = (value: unknown) => value === null ? null : integer(value);
export function parseCultivation(value: unknown) {
  const row = record(value), c = row.cycle === null ? null : record(row.cycle);
  if (c && !['growing', 'needs_water', 'ripe', 'expired'].includes(String(c.state))) invalid();
  return { bed_id: integer(row.bed_id, 1), dug: bool(row.dug), writable: bool(row.writable), server_time: integer(row.server_time),
    cycle: c ? { id: integer(c.id, 1), crop_revision_id: integer(c.crop_revision_id, 1), name: text(c.name), state: String(c.state),
      ready_at: integer(c.ready_at), water_due_at: time(c.water_due_at), water_deadline_at: time(c.water_deadline_at), expires_at: integer(c.expires_at),
      water_missed: bool(c.water_missed), can_water: bool(c.can_water), yield_factor_bps: integer(c.yield_factor_bps, 5000, 10000) } : null };
}
export async function loadCultivation(bed: number) { return parseCultivation((await apiClient.get(config.makeApiUrl(`v1/world/beds/${integer(bed, 1)}/cultivation`))).data); }
export async function loadCrops(page = 1) {
  const row = record((await apiClient.get(config.makeApiUrl('v1/world/crops'), { params: { page } })).data), meta = record(row._meta);
  if (!Array.isArray(row.items) || row.items.length > 20) invalid();
  return { pageCount: integer(meta.pageCount), items: row.items.map(value => {
    const c = record(value);
    return { id: integer(c.id, 1), name: text(c.name), seed_quantity: integer(c.seed_quantity, 1), yield_quantity: integer(c.yield_quantity, 1),
      grow_seconds: integer(c.grow_seconds, 1), water_quantity: integer(c.water_quantity), water_interval_seconds: integer(c.water_interval_seconds),
      water_window_seconds: integer(c.water_window_seconds, 1), harvest_window_seconds: integer(c.harvest_window_seconds, 1) };
  }) };
}
export async function previewCultivation(bed: number, action: CultivationAction, input: Record<string, unknown>) {
  return parseWorldQuote((await apiClient.post(config.makeApiUrl(`v1/world/beds/${integer(bed, 1)}/${action}-preview`), input)).data);
}

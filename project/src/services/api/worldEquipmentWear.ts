import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record } from './world';
export const wearKinds = ['elapsed', 'location', 'work', 'repair'] as const;
export type WearKind = typeof wearKinds[number];
export const wearLabels: Record<WearKind, string> = { elapsed: 'Износ от времени', location: 'Смена среды', work: 'Использование', repair: 'Ремонт' };
const invalid = (): never => { throw new Error('invalid-equipment-wear-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const classes = ['outdoor', 'covered', 'indoor', 'carried'] as const;
type Exposure = typeof classes[number];
const exposure = (value: unknown): Exposure => typeof value === 'string' && classes.includes(value as Exposure) ? value as Exposure : invalid();
const kind = (value: unknown): WearKind => typeof value === 'string' && wearKinds.includes(value as WearKind) ? value as WearKind : invalid();
export async function loadEquipmentWear(instance: number, params: Record<string, unknown>) {
  const r = record((await apiClient.get(config.makeApiUrl(`v1/world/equipment/${id(instance)}/wear`), { params })).data), meta = record(r._meta);
  if (id(r.instance_id) !== instance || typeof r.name !== 'string' || !r.name.trim() || !Array.isArray(r.items) || r.items.length > 20) invalid();
  const maximum = integer(r.max_durability, 1), durability = integer(r.durability, 0, maximum);
  const items = (r.items as unknown[]).map(value => {
    const e = record(value), eventKind = kind(e.kind), started = integer(e.started_at), ended = integer(e.ended_at, started);
    const before = integer(e.durability_before), after = integer(e.durability_after);
    if ((eventKind === 'elapsed' || eventKind === 'work') && after > before) invalid();
    if (eventKind === 'repair' && after <= before) invalid();
    if (eventKind === 'location' && (after !== before || started !== ended)) invalid();
    return { id: id(e.id), kind: eventKind, started, ended, before, after, remainderBefore: integer(e.remainder_before, 0, 86399), remainderAfter: integer(e.remainder_after, 0, 86399),
      classBefore: exposure(e.class_before), classAfter: exposure(e.class_after), rateBefore: integer(e.daily_wear_before), rateAfter: integer(e.daily_wear_after), policy: integer(e.policy_version, 1), created: integer(e.created_at) };
  });
  const total = integer(meta.totalCount), pageSize = integer(meta.perPage, 20, 20);
  if (integer(meta.pageCount) !== Math.ceil(total / pageSize) || items.length > total || items.some((e, index) => index > 0 && e.id >= items[index - 1].id)) invalid();
  if (!['backpack', 'chest', 'placement', 'stockpile', 'recovery', 'shelter'].includes(String(r.storage_kind))) invalid();
  const returnNode = r.return_node_id === null ? null : id(r.return_node_id);
  if (r.storage_kind === 'shelter' && returnNode === null) invalid();
  return { name: r.name as string, durability, maximum, exposure: exposure(r.exposure_class), dailyWear: integer(r.daily_wear), storageId: id(r.storage_id), shelter: r.storage_kind === 'shelter', returnNode,
    items, total, pageSize, currentPage: integer(meta.currentPage, 1, 1000000), serverTime: integer(r.server_time) };
}

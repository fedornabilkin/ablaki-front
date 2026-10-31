import { apiClient, readApi } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, parseWorldQuote } from './world';
import { creditAmount } from '@/entities/world/credits';
export function parseEconomyStorage(value: unknown) {
  const row = record(value);
  if (!Array.isArray(row.options) || row.options.length > 50 || typeof row.writable !== 'boolean' || (row.kind !== undefined && !['backpack', 'chest', 'stockpile', 'placement', 'harvest'].includes(String(row.kind)))) throw new Error('invalid-world-response');
  const capacity = integer(row.capacity, 1, 10000);
  return { id: integer(row.storage_id, 1), capacity, kind: row.kind as string | undefined, writable: row.writable, options: row.options.map(value => {
    const pack = record(value);
    if (typeof pack.code !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(pack.code)) throw new Error('invalid-world-response');
    const slots = integer(pack.slots, 1, 100), after = integer(pack.capacity_after, 1, 10000);
    if (after !== capacity + slots) throw new Error('invalid-world-response');
    return { code: pack.code, slots, after, price: creditAmount(pack.price_cr) };
  }) };
}
const url = (id: number, suffix = '') => config.makeApiUrl(`v1/world/economy/storage/${integer(id, 1)}${suffix}`);
export async function loadEconomyStorage(id: number) { return parseEconomyStorage((await readApi(url(id))).data); }
export async function previewEconomyStorage(id: number, code: string) { return parseWorldQuote((await apiClient.post(url(id, '/expand-preview'), { code })).data); }
export type EconomyStorageState = ReturnType<typeof parseEconomyStorage>;

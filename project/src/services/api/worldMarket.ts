import { readApi } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record } from './world';

export interface MarketItem { inventoryId: number; name: string; icon: string; quantity: number; buy: string; sell: string; base: string; bid: string }
export interface MarketState { cityId: number; version: number; maximum: number; nextDelivery: number; reserve: string; buy: MarketItem[]; sell: MarketItem[]; buyRemaining: number; sellRemaining: number; fees: { delivery: number; city: number; owner: number; sell: number } }
function money(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{1,16}\.\d{4}$/.test(value)) throw new Error('invalid-world-response');
  return value;
}
function items(value: unknown): MarketItem[] {
  if (!Array.isArray(value) || value.length > 2000) throw new Error('invalid-world-response');
  return value.map(value => {
    const r = record(value), p = record(r.prices);
    if (typeof r.name !== 'string' || r.name.length > 255 || (r.icon !== null && typeof r.icon !== 'string')) throw new Error('invalid-world-response');
    return { inventoryId: integer(r.inventory_id, 1), name: r.name, icon: r.icon || 'cubes', quantity: integer(r.quantity, 1), buy: money(p.buy_cr), sell: money(p.sell_cr), base: money(p.base_cr), bid: money(p.bid_cr) };
  });
}
export function parseMarket(value: unknown): MarketState {
  const r = record(value), m = record(r.market), buy = record(r.buy), sell = record(r.sell);
  return { cityId: integer(m.city_id, 1), version: integer(m.profile_version, 1), maximum: integer(m.max_quantity, 1, 100),
    nextDelivery: integer(m.next_delivery_at), reserve: money(m.buyback_available_cr), buy: items(buy.items), sell: items(sell.items),
    buyRemaining: integer(record(buy.limits).remaining), sellRemaining: integer(record(sell.limits).remaining), fees: { delivery: integer(record(m.fees).delivery_bps, 0, 10000), city: integer(record(m.fees).city_bps, 0, 10000), owner: integer(record(m.fees).owner_bps, 0, 10000), sell: integer(record(m.fees).sell_burn_bps, 0, 10000) } };
}
export async function loadMarket(cityId: number) { return parseMarket((await readApi(config.makeApiUrl(`v1/world/markets/${cityId}`))).data); }
export function marketTotal(unit: string, quantity: number): string {
  const [whole, fraction] = unit.split('.');
  const units = (BigInt(whole) * 10000n + BigInt(fraction)) * BigInt(quantity);
  return `${units / 10000n}.${String(units % 10000n).padStart(4, '0')}`;
}

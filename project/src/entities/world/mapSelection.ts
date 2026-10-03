import type { MapPoint } from './coordinates';
export interface MapPricing { paid_cells: number; base_price: string; next_price: string; bulk_minimum: number; discount_bps: number; max_quantity: number; currency: 'Cr' }
export function requiredExplorerLevel(point: MapPoint): number { return Math.max(1, Math.min(3, Math.max(Math.abs(point.x), Math.abs(point.y)))); }
export function mapPurchase(pricing: MapPricing, quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > pricing.max_quantity) throw new Error('invalid-map-quantity');
  const base = BigInt(pricing.base_price.replace('.', '')), paid = BigInt(pricing.paid_cells), count = BigInt(quantity);
  const gross = base * (count * paid + count * (count + 1n) / 2n);
  const discount = quantity >= pricing.bulk_minimum ? gross * BigInt(pricing.discount_bps) / 10000n : 0n;
  const decimal = (n: bigint) => `${n / 10000n}.${String(n % 10000n).padStart(4, '0')}`;
  let cumulative = 0n, discountBefore = 0n;
  const unitPrices = Array.from({ length: quantity }, (_, i) => {
    const unit = base * (paid + BigInt(i + 1)); cumulative += unit;
    const part = quantity >= pricing.bulk_minimum ? cumulative * BigInt(pricing.discount_bps) / 10000n : 0n;
    const net = decimal(unit - (part - discountBefore)); discountBefore = part; return net;
  });
  return { total: decimal(gross - discount), discount: decimal(discount), gross: decimal(gross), unitPrices };
}
export function selectMapCells(current: MapPoint[], point: MapPoint, anchor: MapPoint | null, mode: 'single' | 'toggle' | 'range', available: MapPoint[], limit = 100): MapPoint[] {
  const key = (p: MapPoint) => `${p.x}:${p.y}`;
  if (mode === 'single') return [point];
  if (mode === 'toggle') return current.some(p => key(p) === key(point)) ? current.filter(p => key(p) !== key(point)) : [...current, point].slice(0, limit);
  const from = anchor ?? point;
  const rectangle = available.filter(p => p.x >= Math.min(from.x, point.x) && p.x <= Math.max(from.x, point.x) && p.y >= Math.min(from.y, point.y) && p.y <= Math.max(from.y, point.y));
  return Array.from(new Map([...current, ...rectangle].map(p => [key(p), p])).values()).slice(0, limit);
}

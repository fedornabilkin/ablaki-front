import { describe, expect, it } from 'vitest';
import { marketTotal, parseMarket } from '../src/services/api/worldMarket';
import { formatExactCredits } from '../src/entities/world/credits';

describe('market prices and offers', () => {
  it('preserves all four decimal places without floating point rounding', () => {
    expect(marketTotal('0.0001', 9)).toBe('0.0009');
    expect(marketTotal('1.3500', 7)).toBe('9.4500');
    expect(marketTotal('999999999999.9999', 100)).toBe('99999999999999.9900');
    expect(formatExactCredits('3.7500')).toBe('3.75');
    expect(formatExactCredits('0.0001')).toBe('0.0001');
    expect(formatExactCredits('99999999999999.9900')).toBe('99999999999999.99');
  });
  it('retains net buyback price, available quantities and the published revision', () => {
    const item = { inventory_id: 12, name: 'Камень', icon: 'cubes', quantity: 2, prices: { buy_cr: '3.7500', sell_cr: '1.3500', base_cr: '3.0000', bid_cr: '1.5000' } };
    const response = { market: { city_id: 4, profile_version: 7, max_quantity: 10, next_delivery_at: 1900, buyback_available_cr: '200.0000', fees: { delivery_bps: 1500, city_bps: 500, owner_bps: 500, sell_burn_bps: 1000 } }, buy: { items: [item], limits: { remaining: 20 } }, sell: { items: [item], limits: { remaining: 19 } } };
    expect(parseMarket(response)).toMatchObject({ version: 7, sellRemaining: 19, sell: [{ sell: '1.3500', quantity: 2 }] });
    expect(() => parseMarket({ ...response, buy: { ...response.buy, items: [{ ...item, prices: { ...item.prices, buy_cr: '-3.7500' } }] } })).toThrow();
    expect(() => parseMarket({ ...response, market: { ...response.market, max_quantity: 101 } })).toThrow();
  });
});

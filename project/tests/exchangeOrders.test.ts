import { describe, expect, it } from 'vitest';
import { affordableOrder, exchangeDirection, exchangeOrder } from '@/services/api/exchangeOrders';

const base = { id: '1', user_id: '3', user_client: null, credit: '50', amount: '2.5', type: 'buy' };
describe('exchange direction and balances', () => {
  it('uses API buy/sell from the counterparty perspective while reversing the creator label', () => {
    const sale = exchangeOrder(base);
    expect(exchangeDirection(sale, 3)).toBe('sell');
    expect(exchangeDirection(sale, 4)).toBe('buy');
    const purchase = exchangeOrder({ ...base, type: 'sell' });
    expect(exchangeDirection(purchase, 3)).toBe('buy');
    expect(exchangeDirection(purchase, 4)).toBe('sell');
  });
  it('checks kilograms for buying credits and credits for selling, never the opposite balance', () => {
    const sale = exchangeOrder(base);
    expect(affordableOrder(sale, 4, { balance: '2.5', credit: 0 })).toBe(true);
    expect(affordableOrder(sale, 4, { balance: 0, credit: 999 })).toBe(false);
    const purchase = exchangeOrder({ ...base, type: 'sell' });
    expect(affordableOrder(purchase, 4, { balance: 0, credit: 50 })).toBe(true);
    expect(affordableOrder(purchase, 4, { balance: 999, credit: 49 })).toBe(false);
  });
  it('does not allow settlement of own or completed orders or an unknown balance', () => {
    const sale = exchangeOrder(base);
    expect(affordableOrder(sale, 3, { balance: 999 })).toBe(false);
    expect(affordableOrder({ ...sale, user_client: 5 }, 4, { balance: 999 })).toBe(false);
    expect(affordableOrder(sale, 4, {})).toBe(false);
    expect(exchangeDirection({ ...sale, user_client: 5 }, 4)).toBeNull();
  });
  it('rejects invalid amounts and types before enabling a financial action', () => {
    for (const patch of [{ type: 'unknown' }, { credit: 0 }, { amount: -1 }, { credit: true }, { user_id: null }, { user_client: -1 }]) {
      expect(() => exchangeOrder({ ...base, ...patch })).toThrow('invalid-response');
    }
  });
});

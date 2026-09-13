import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/services/httpClient';
import { decodeStatistics, getStatistics } from '../src/services/api/statistics';

const totals = { users: 10, games: { orel: 10, saper: 10 }, forum: { themes: 10, comments: 10 }, exchange: 10 };
const counts = { total: 10, today: 3, yesterday: 2 };
const periods = { users: counts, games: { orel: counts, saper: counts }, forum: { themes: counts, comments: counts }, transfers: counts, exchange: counts };
afterEach(() => vi.restoreAllMocks());

describe('statistics API', () => {
  it('reads the compatible envelope and the earlier nested period response', () => {
    expect(decodeStatistics({ ...totals, periods })).toEqual(periods);
    expect(decodeStatistics(periods)).toEqual(periods);
  });
  it('preserves legacy totals without inventing daily counts or missing transfers', () => {
    const result = decodeStatistics(totals);
    expect(result.users).toEqual({ total: 10, today: null, yesterday: null });
    expect(result.transfers).toBeNull();
    expect(decodeStatistics({ ...totals, transfers: 0 }).transfers?.total).toBe(0);
  });
  it.each([null, [], { errors: ['failed'] }, { ...totals, periods: null }, { ...totals, games: [] },
    ...[-1, 1.2, NaN, Infinity, '10', null].map(total => ({ ...periods, users: { ...counts, total } })),
    { ...periods, users: { total: 1, today: 1, yesterday: 1 } },
    { ...periods, users: { total: 10, today: 3 } },
  ])('rejects malformed data: %j', raw => {
    expect(() => decodeStatistics(raw)).toThrow('invalid-statistics');
  });
  it('loads the public endpoint and propagates network failures for retry', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { ...totals, periods } }).mockRejectedValueOnce(new Error('offline'));
    expect(await getStatistics()).toEqual(periods);
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/v1\/stat$/));
    await expect(getStatistics()).rejects.toThrow('offline');
  });
});

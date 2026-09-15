import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/services/httpClient';
import { parsePrizeFund, prizeFund } from '../src/services/api/homeActivity';
afterEach(() => vi.restoreAllMocks());
const guest = { date: '2026-09-15', timezone: 'Europe/Moscow', today: 10, tomorrow: 2, user_today: null, user_tomorrow: null };
describe('homepage prize estimate contract', () => {
  it('preserves real zero funds and unavailable personal estimates for guests', () => {
    expect(parsePrizeFund({ ...guest, today: 0, tomorrow: 0 })).toEqual({ ...guest, today: 0, tomorrow: 0 });
    for (const today of [null, undefined, '', '10', -1, Infinity]) expect(() => parsePrizeFund({ ...guest, today })).toThrow();
  });
  it('uses a protected route for personal estimates and never accepts a guest payload as personal', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: guest });
    await expect(prizeFund(false)).resolves.toEqual(guest);
    expect(get).toHaveBeenLastCalledWith(expect.stringMatching(/v1\/bonus\/fund$/));
    await expect(prizeFund(true)).rejects.toThrow();
    get.mockResolvedValue({ data: { ...guest, user_today: 4, user_tomorrow: 1 } });
    await expect(prizeFund(true)).resolves.toMatchObject({ user_today: 4, user_tomorrow: 1 });
    expect(get).toHaveBeenLastCalledWith(expect.stringMatching(/v1\/bonus\/my-fund$/));
    await expect(prizeFund(false)).rejects.toThrow();
  });
});

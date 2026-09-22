import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/services/httpClient';
import { lobbyStakes } from '../src/services/api/gameHistory';
afterEach(() => vi.restoreAllMocks());
describe('game lobby stakes', () => {
  it('requests groups independently of selected stake and pagination for each game kind', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [{ kon: '5.00', count: '2' }, { kon: 10, count: 1 }] });
    for (const kind of ['orel', 'saper', 'duel', 'five'] as const) {
      expect(await lobbyStakes(kind, 'my')).toEqual([{ kon: '5.00', count: 2 }, { kon: '10', count: 1 }]);
      expect(get).toHaveBeenLastCalledWith(expect.stringContaining(`v1/${kind}/stakes`), { params: { scope: 'my' } });
    }
  });
  it('distinguishes an empty list from invalid data and a failed request', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: [] });
    expect(await lobbyStakes('orel', 'available')).toEqual([]);
    get.mockResolvedValueOnce({ data: [{ kon: 0, count: 1 }] });
    await expect(lobbyStakes('orel', 'available')).rejects.toThrow();
    get.mockRejectedValueOnce(new Error('offline'));
    await expect(lobbyStakes('orel', 'available')).rejects.toThrow('offline');
  });
});

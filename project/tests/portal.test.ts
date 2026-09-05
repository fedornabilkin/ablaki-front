import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/services/httpClient';
import { checkMutation, detail, list, mutate, pageData } from '../src/services/api/portal';

afterEach(() => vi.restoreAllMocks());
describe('portal API contracts', () => {
  it('preserves pagination and handles missing CORS-exposed headers without inventing a total', () => {
    expect(pageData([{ id: '12' }], { 'x-pagination-total-count': '45', 'x-pagination-per-page': '10' })).toEqual({ items: [{ id: 12 }], total: 45, pageSize: 10 });
    expect(pageData([], {}).total).toBeNull();
    expect(pageData([], { 'x-pagination-total-count': 'invalid' }).total).toBeNull();
  });
  it('rejects error envelopes and invalid records instead of showing empty or malformed lists', () => {
    expect(() => pageData({ errors: ['failed'] }, {})).toThrow();
    expect(() => pageData([{ title: 'missing id' }], {})).toThrow();
    expect(() => pageData([{ id: null }], {})).toThrow();
    expect(() => pageData([{ id: true }], {})).toThrow();
  });
  it('accepts empty successful command responses and rejects Yii validation responses sent with 200', () => {
    for (const data of ['', null, undefined, true]) expect(() => checkMutation(data)).not.toThrow();
    for (const data of [{ errors: {} }, { kon: ['Invalid value'] }, [{ field: 'title', message: 'Required' }]]) {
      expect(() => checkMutation(data)).toThrow();
    }
  });
  it('sends page and theme filter separately through the shared client', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [{ id: 1 }], headers: {} });
    await list('forum-comment', 3, { 'filter[theme_id]': '7', expand: 'user' });
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/v1\/forum-comment$/), { params: { page: 3, 'filter[theme_id]': '7', expand: 'user' } });
  });
  it('accepts 201 with an empty body for credit transfer creation', async () => {
    const request = vi.spyOn(apiClient, 'request').mockResolvedValue({ data: '', status: 201 });
    await expect(mutate('transfer', 'post', { amount: 10, count: 1 })).resolves.toBe('');
    expect(request).toHaveBeenCalledWith({ url: expect.stringMatching(/v1\/transfer$/), method: 'post', data: { amount: 10, count: 1 } });
  });
  it('rejects a missing public wall', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: null });
    await expect(detail('users/wall/missing')).rejects.toThrow();
  });
});

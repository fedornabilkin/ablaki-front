import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/services/httpClient';
import { giveCommentCredit, historyTypes, parseCommentGift, parseHistoryTypes } from '../src/services/api/community';

afterEach(() => vi.restoreAllMocks());
describe('community API', () => {
  it('fetches account-specific operation types and retains server identifiers', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [{ type: 'forum_gift', count: '12' }, { type: 'everyday', label: 'Ежедневный бонус', count: 1 }] });
    expect(await historyTypes('balance')).toEqual([{ value: 'forum_gift', label: 'forum_gift (12)' }, { value: 'everyday', label: 'Ежедневный бонус (1)' }]);
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/v1\/history\/balance-type$/));
  });
  it('rejects malformed type responses instead of silently removing the filter', () => {
    for (const value of [null, {}, [{ type: '' }], [{ type: 1 }]]) expect(() => parseHistoryTypes(value)).toThrow();
  });
  it('sends one explicit gift command with the amount controlled by the server', async () => {
    const response = { commentId: 8, alreadyGiven: false, giftCount: 3, giftedByMe: true, credit: 9 };
    const request = vi.spyOn(apiClient, 'request').mockResolvedValue({ data: response });
    await expect(giveCommentCredit(8)).resolves.toEqual(response);
    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith({ url: expect.stringMatching(/v1\/forum-comment\/8\/gift$/), method: 'post', data: undefined });
  });
  it('accepts idempotent acknowledgement and rejects uncertain or wrong-message responses', () => {
    const response = { commentId: 8, alreadyGiven: true, giftCount: 3, giftedByMe: true, credit: 9 };
    expect(parseCommentGift(response, 8).alreadyGiven).toBe(true);
    for (const value of ['', { ...response, commentId: 9 }, { ...response, credit: -1 }, { ...response, giftedByMe: false }, { ...response, giftCount: '3' }]) {
      expect(() => parseCommentGift(value, 8)).toThrow();
    }
  });
  it('does not send invalid gift IDs to the API', async () => {
    const request = vi.spyOn(apiClient, 'request');
    await expect(giveCommentCredit(0)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});

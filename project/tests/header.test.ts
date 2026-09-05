import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/services/httpClient';
import { createPresenceHeartbeat, formatAccountNumber, heartbeat, onlineCount, parseOnlineCount, parseTip, randomTip } from '../src/services/api/header';

afterEach(() => vi.restoreAllMocks());
describe('header API', () => {
  it('keeps genuine zero counts and rejects unavailable or malformed values', () => {
    expect(parseOnlineCount({ count: 0, windowSeconds: 300 })).toEqual({ count: 0, windowSeconds: 300 });
    for (const value of [null, {}, { count: '2', windowSeconds: 300 }, { count: -1, windowSeconds: 300 }]) expect(() => parseOnlineCount(value)).toThrow();
  });
  it('uses the explicit heartbeat command and read-only count route', async () => {
    const result = { count: 5, windowSeconds: 300 };
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: result });
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: result });
    await expect(heartbeat()).resolves.toEqual(result);
    await expect(onlineCount()).resolves.toEqual(result);
    expect(post).toHaveBeenCalledWith(expect.stringMatching(/v1\/users\/heartbeat$/));
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/v1\/users\/online-count$/));
  });
  it('allows no tip without inventing content and preserves plain server text', async () => {
    expect(parseTip(null)).toBeNull();
    expect(parseTip({ id: '2', title: '  Текст подсказки  ', type: 'info' })).toEqual({ id: 2, title: 'Текст подсказки' });
    expect(() => parseTip({ id: 2, title: '' })).toThrow();
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: null });
    await expect(randomTip()).resolves.toBeNull();
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/v1\/tips\/random$/));
  });
  it('never presents an absent account balance as zero', () => {
    for (const value of [null, undefined, '', ' ', Infinity, {}, true]) expect(formatAccountNumber(value)).toBe('—');
    expect(formatAccountNumber(0)).toBe('0');
    expect(formatAccountNumber('1.25')).toBe('1,25');
  });
});
describe('presence request lifecycle', () => {
  it('sends only for active callers, once a minute, and never duplicates a pending request', async () => {
    let now = 0;
    let finish!: () => void;
    const send = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const ping = createPresenceHeartbeat(send, () => now);
    expect(await ping(false)).toBe(false);
    const pending = ping(true);
    now = 90_000;
    expect(await ping(true)).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
    finish(); await pending;
    const second = ping(true);
    expect(send).toHaveBeenCalledTimes(2);
    finish(); await second;
    now = 100_000;
    expect(await ping(true)).toBe(false);
  });
  it('a failed heartbeat is not retried on every pointer or key event', async () => {
    let now = 0;
    const send = vi.fn().mockRejectedValue(new Error('network'));
    const ping = createPresenceHeartbeat(send, () => now);
    await expect(ping(true)).rejects.toThrow('network');
    now = 59_999;
    expect(await ping(true)).toBe(false);
    now = 60_000;
    await expect(ping(true)).rejects.toThrow('network');
    expect(send).toHaveBeenCalledTimes(2);
  });
});

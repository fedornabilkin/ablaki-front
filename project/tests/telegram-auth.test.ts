import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useTelegramApproval } from '../src/hooks/useTelegramApproval';
import * as api from '../src/services/api/telegramAuth';

vi.mock('../src/services/api/telegramAuth', async importOriginal => ({
  ...await importOriginal<typeof api>(), startTelegram: vi.fn(), pollTelegram: vi.fn(), cancelTelegram: vi.fn(),
}));
const request = () => ({ id: 'a'.repeat(43), browser_secret: 'b'.repeat(43), display_code: '123456',
  expires_at: Date.now() / 1000 + 300, telegram_url: `https://t.me/AblakinTestBot?start=login_${'a'.repeat(43)}`, poll_after_ms: 2000, status: 'pending' });
const scopes: ReturnType<typeof effectScope>[] = [];
function setup(purpose: api.TelegramPurpose = 'login') {
  const scope = effectScope(); scopes.push(scope);
  const finish = vi.fn().mockResolvedValue({ token: 'site-token', user: { id: 1 } });
  const done = vi.fn();
  const flow = scope.run(() => useTelegramApproval(purpose, finish, done))!;
  return { flow, finish, done, scope };
}
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
beforeEach(() => {
  vi.useFakeTimers(); vi.resetAllMocks();
  const storage = new Map<string, string>();
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  vi.mocked(api.startTelegram).mockResolvedValue(request());
  vi.mocked(api.pollTelegram).mockResolvedValue({ status: 'pending', telegram: null });
  vi.mocked(api.cancelTelegram).mockResolvedValue({} as never);
});
afterEach(() => { scopes.splice(0).forEach(scope => scope.stop()); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Telegram chat approval', () => {
  it('logs in automatically after chat confirmation, without a chat return link', async () => {
    const { flow, finish, done } = setup();
    await flow.start(false);
    vi.mocked(api.pollTelegram).mockResolvedValue({ status: 'approved', telegram: { username: 'player' } });
    await vi.advanceTimersByTimeAsync(2000);
    expect(finish).toHaveBeenCalledOnce(); expect(done).toHaveBeenCalledOnce();
    expect(flow.phase.value).toBe('done');
    expect(sessionStorage.getItem('telegram-auth.pending')).toBeNull();
  });
  it('asks the account owner to confirm a binding before changing login methods', async () => {
    const { flow, finish } = setup('link');
    vi.mocked(api.pollTelegram).mockResolvedValue({ status: 'approved', telegram: { username: 'person' } });
    await flow.start(false); await flush();
    expect(finish).not.toHaveBeenCalled(); expect(flow.phase.value).toBe('approved');
    await flow.complete(); expect(finish).toHaveBeenCalledOnce();
  });
  it('ignores approval arriving after the dialog was closed', async () => {
    let resolve!: (value: api.TelegramStatus) => void;
    vi.mocked(api.pollTelegram).mockImplementation(() => new Promise(yes => { resolve = yes; }));
    const { flow, finish } = setup(); await flow.start(false);
    flow.cancel(); resolve({ status: 'approved', telegram: null }); await flush();
    expect(finish).not.toHaveBeenCalled(); expect(api.cancelTelegram).toHaveBeenCalledOnce();
    expect(flow.phase.value).toBe('idle');
  });
  it('polls sequentially and retries a temporary network failure', async () => {
    const { flow } = setup();
    vi.mocked(api.pollTelegram).mockRejectedValueOnce(new Error('offline'));
    await flow.start(false); await flush(); expect(flow.error.value).toContain('Связь');
    await vi.advanceTimersByTimeAsync(5000); expect(api.pollTelegram).toHaveBeenCalledTimes(2);
    expect(flow.error.value).toBe('');
  });
  it('expires and stops polling', async () => {
    vi.mocked(api.startTelegram).mockResolvedValue({ ...request(), expires_at: Date.now() / 1000 + 1 });
    const { flow, finish } = setup(); await flow.start(false);
    await vi.advanceTimersByTimeAsync(10000);
    expect(flow.phase.value).toBe('expired'); expect(finish).not.toHaveBeenCalled(); expect(api.pollTelegram).toHaveBeenCalledOnce();
  });
  it('keeps a browser proof for reload and resumes the same request', async () => {
    const old = setup(); await old.flow.start(false); old.scope.stop();
    const next = setup(); expect(next.flow.restore()).toBe(true);
    expect(next.flow.request.value?.id).toBe(request().id); expect(api.startTelegram).toHaveBeenCalledOnce();
  });
  it('rejects manipulated storage links and refuses a different purpose', () => {
    const { flow } = setup();
    sessionStorage.setItem('telegram-auth.pending', JSON.stringify({ purpose: 'login', request: { ...request(), telegram_url: 'javascript:alert(1)' } }));
    expect(flow.restore()).toBe(false);
    sessionStorage.setItem('telegram-auth.pending', JSON.stringify({ purpose: 'link', request: request() }));
    expect(flow.restore()).toBe(false);
  });
  it('stops pending work on unmount and does not navigate on a late result', async () => {
    let finish!: () => void;
    const { flow, finish: exchange, done, scope } = setup();
    exchange.mockImplementation(() => new Promise<void>(yes => { finish = yes; }));
    vi.mocked(api.pollTelegram).mockResolvedValue({ status: 'approved', telegram: null });
    await flow.start(false); await flush(); scope.stop(); finish(); await flush();
    expect(done).not.toHaveBeenCalled();
    expect(exchange.mock.calls[0][1].aborted).toBe(true);
  });
  it('allows retry after a lost exchange response without starting a new request', async () => {
    const { flow, finish } = setup(); finish.mockRejectedValueOnce(new Error('connection reset'));
    vi.mocked(api.pollTelegram).mockResolvedValue({ status: 'approved', telegram: null });
    await flow.start(true); await flush(); expect(flow.phase.value).toBe('approved');
    await flow.complete(); expect(flow.phase.value).toBe('done'); expect(api.startTelegram).toHaveBeenCalledOnce();
  });
  it('does not offer to re-enter an old account after a different login won the race', async () => {
    const { flow, finish } = setup();
    finish.mockRejectedValue(Object.assign(new Error('Вход отменён'), { code: 'AUTH_SUPERSEDED' }));
    vi.mocked(api.pollTelegram).mockResolvedValue({ status: 'approved', telegram: null });
    await flow.start(false); await flush();
    expect(flow.phase.value).toBe('cancelled');
    expect(sessionStorage.getItem('telegram-auth.pending')).toBeNull();
  });
});

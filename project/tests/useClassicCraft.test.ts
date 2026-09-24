import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClassicCraft } from '../src/hooks/useClassicCraft';
const api = vi.hoisted(() => ({loadCraft: vi.fn(), sendCraft: vi.fn(), craftError: () => 'Ошибка запроса'}));
vi.mock('../src/services/api/classicCraft', () => api);
let scope: EffectScope;
beforeEach(() => { vi.clearAllMocks(); scope = effectScope(); });
afterEach(() => {scope.stop(); vi.unstubAllGlobals();});
describe('account craft requests', () => {
  it('restores the exact chest destination and quoted purchase price after a lost response', async () => {
    const values = new Map<string,string>();
    vi.stubGlobal('sessionStorage', {getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key)});
    for (const input of [{action: 'transfer' as const, id: 5, quantity: 7, slot_id: 9, container_id: 20, position: 3}, {action: 'buy_slots' as const, id: 0, quantity: 2, unit_price: 10}]) {
      values.clear(); api.sendCraft.mockRejectedValueOnce(new Error('offline'));
      const first = scope.run(() => useClassicCraft(ref(1), vi.fn(), ref(37)))!;
      await first.submit(input);
      const restored = scope.run(() => useClassicCraft(ref(1), vi.fn(), ref(37)))!;
      expect(restored.pending.value).toEqual(first.pending.value); expect(restored.pending.value).toMatchObject(input);
    }
  });
  it('restores and retries both stack IDs after an unknown merge outcome', async () => {
    const values = new Map<string,string>();
    vi.stubGlobal('sessionStorage', {getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key)});
    api.sendCraft.mockRejectedValueOnce(new Error('offline'));
    const first = scope.run(() => useClassicCraft(ref(1), vi.fn(), ref(37)))!;
    await first.command('merge', 5, 1, 7, 8);
    const restored = scope.run(() => useClassicCraft(ref(2), vi.fn(), ref(37)))!;
    expect(restored.pending.value).toMatchObject({action: 'merge', id: 5, slot_id: 7, target_slot_id: 8});
    api.sendCraft.mockResolvedValueOnce({state: {}, message: 'Объединено'});
    await restored.retry();
    expect(api.sendCraft.mock.calls[1][0]).toEqual(api.sendCraft.mock.calls[0][0]);
  });
  it('restores a pending key after remount only for its owning account', async () => {
    const values = new Map<string,string>();
    vi.stubGlobal('sessionStorage', {getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k,v), removeItem: (k: string) => values.delete(k)});
    api.sendCraft.mockRejectedValueOnce(new Error('lost response'));
    const first = scope.run(() => useClassicCraft(ref(1), vi.fn(), ref(37)))!;
    await first.command('discard', 4, 250, 55);
    const recovered = scope.run(() => useClassicCraft(ref(2), vi.fn(), ref(37)))!;
    const other = scope.run(() => useClassicCraft(ref(2), vi.fn(), ref(46)))!;
    expect(recovered.pending.value).toEqual(first.pending.value);
    expect(recovered.pending.value).toMatchObject({action: 'discard', id: 4, quantity: 250, slot_id: 55});
    expect(other.pending.value).toBeNull();
  });
  it('blocks duplicate clicks and ignores an earlier state read', async () => {
    let load!: (v: unknown) => void, send!: (v: unknown) => void;
    api.loadCraft.mockImplementation(() => new Promise(resolve => {load = resolve;}));
    api.sendCraft.mockImplementation(() => new Promise(resolve => {send = resolve;}));
    const refresh = vi.fn().mockResolvedValue(null);
    const craft = scope.run(() => useClassicCraft(ref(1), refresh))!;
    const reading = craft.refresh(), command = craft.command('craft', 1, 2);
    await craft.command('craft', 1, 2); expect(api.sendCraft).toHaveBeenCalledOnce();
    send({state: {credit: 4}, message: 'Done'}); await command;
    load({credit: 10}); await reading;
    expect(craft.state.value?.credit).toBe(4); expect(refresh).toHaveBeenCalledOnce();
  });
  it('reuses the exact idempotency key after an unknown network outcome', async () => {
    api.sendCraft.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({state: {credit: 4}, message: 'Done'});
    const craft = scope.run(() => useClassicCraft(ref(1), vi.fn().mockResolvedValue(null)))!;
    await craft.command('craft', 1, 2);
    const request = api.sendCraft.mock.calls[0][0];
    expect(craft.pending.value).toEqual(request);
    await craft.command('craft', 2, 1); expect(api.sendCraft).toHaveBeenCalledOnce();
    await craft.retry(); expect(api.sendCraft.mock.calls[1][0]).toEqual(request); expect(craft.pending.value).toBeNull();
  });
  it('drops old session responses without updating the next account', async () => {
    let send!: (v: unknown) => void; api.sendCraft.mockImplementation(() => new Promise(resolve => {send = resolve;}));
    const session = ref(1), refresh = vi.fn();
    const craft = scope.run(() => useClassicCraft(session, refresh))!;
    const command = craft.command('starter'); session.value++; await nextTick();
    send({state: {credit: 999}, message: 'Done'}); await command;
    expect(craft.state.value).toBeNull(); expect(craft.pending.value).toBeNull(); expect(refresh).not.toHaveBeenCalled();
  });
  it('does not retry completed craft when only the profile refresh fails', async () => {
    api.sendCraft.mockResolvedValue({state: {credit: 4}, message: 'Done'});
    const craft = scope.run(() => useClassicCraft(ref(1), vi.fn().mockRejectedValue(new Error('offline'))))!;
    await craft.command('craft', 1); await craft.retry();
    expect(api.sendCraft).toHaveBeenCalledOnce(); expect(craft.pending.value).toBeNull(); expect(craft.notice.value).toContain('профиль');
  });
});

import { effectScope, nextTick, reactive, ref, type EffectScope } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameHistory } from '../src/hooks/useGameHistory';
import { historyKons, historyPeriod } from '../src/services/api/gameHistory';

const context = vi.hoisted(() => ({ route: null as any, router: null as any, get: vi.fn() }));
vi.mock('vue-router', () => ({ useRoute: () => context.route, useRouter: () => context.router }));
vi.mock('../src/services/httpClient', () => ({ apiClient: { get: context.get } }));
let scope: EffectScope;
const flush = async () => { for (let i = 0; i < 5; i++) { await nextTick(); await Promise.resolve(); } };
const response = { data: { items: [{ id: 1 }], _meta: { totalCount: 1, perPage: 20, currentPage: 1, pageCount: 1 } }, headers: {} };
const isKons = (url: string) => url.includes('history-kons');
beforeEach(() => {
  context.route = reactive({ path: '/games/orel/history', query: { page: '3', kon: '5', period: 'week', q: 'legacy-search' }, hash: '' });
  context.router = { push: vi.fn(async target => { context.route.query = target.query; }) };
  context.get.mockReset().mockImplementation(async url => isKons(url) ? { data: [{ kon: '5.00', count: '3' }] } : response);
  scope = effectScope();
});
afterEach(() => scope.stop());

describe('history period and grouped stakes', () => {
  it('requests grouped options separately without selected stake, search or pagination', async () => {
    const state = scope.run(() => useGameHistory(ref('orel'), 'history', ref(0), ref(1)))!;
    await flush();
    const calls = context.get.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls.find(([url]) => isKons(url))?.[1].params).toEqual({ period: 'week', scope: 'history' });
    expect(calls.find(([url]) => !isKons(url))?.[1].params).toEqual({ period: 'week', page: 3, 'filter[kon]': '5', sort: '-updated_at,-id', 'per-page': 20, envelope: 1 });
    expect(state.kons.data.value).toEqual([{ kon: '5.00', count: 3 }]);
    state.selectPeriod('today'); await flush();
    expect(state.page.value).toBe(1); expect(state.kon.value).toBe('');
    expect(context.get.mock.calls.filter(([url]) => isKons(url))).toHaveLength(2);
    expect(context.get.mock.calls.filter(([url]) => !isKons(url))).toHaveLength(2);
    state.selectKon('10'); await flush();
    expect(context.get.mock.calls.filter(([url]) => isKons(url))).toHaveLength(2);
    expect(context.get.mock.calls.filter(([url]) => !isKons(url))).toHaveLength(3);
    // Back navigation restores the exact applied selection.
    context.route.query = { period: 'week', kon: '5', page: '3' }; await flush();
    expect(state.period.value).toBe('week'); expect(state.kon.value).toBe('5'); expect(state.page.value).toBe(3);
  });
  it('ignores late options and rows from a previous period or session', async () => {
    const pending: { url: string; resolve: (data: any) => void }[] = [];
    context.get.mockImplementation(url => new Promise(resolve => pending.push({ url, resolve })));
    const session = ref(1);
    const state = scope.run(() => useGameHistory(ref('orel'), 'history', ref(0), session))!;
    state.selectPeriod('today'); await flush();
    for (const item of pending.slice(2)) item.resolve(isKons(item.url) ? { data: [{ kon: 10, count: 2 }] } : response);
    await flush();
    for (const item of pending.slice(0, 2)) item.resolve(isKons(item.url) ? { data: [{ kon: 5, count: 99 }] } : { ...response, data: { ...response.data, items: [{ id: 99 }] } });
    await flush();
    expect(state.kons.data.value).toEqual([{ kon: '10', count: 2 }]); expect(state.history.data.value.items[0].id).toBe(1);
    session.value++; await flush();
    expect(state.kons.data.value).toEqual([]); expect(state.history.data.value.items).toEqual([]);
  });
  it('keeps recent filters separate and reports grouped request errors for retry', async () => {
    context.route.query = { period: 'week', page: '3', recent_period: 'yesterday', recent_kon: '5' };
    context.get.mockRejectedValueOnce(new Error('offline'));
    const state = scope.run(() => useGameHistory(ref('saper'), 'recent', ref(0), ref(1)))!;
    await flush();
    expect(state.kons.error.value).not.toBe('');
    await state.kons.refresh(); expect(state.kons.error.value).toBe('');
    state.selectPeriod('month'); await flush();
    expect(context.route.query).toEqual({ period: 'week', page: '3', recent_period: 'month' });
    expect(context.get.mock.calls.at(-1)?.[1].params.sort).toBe('-time_over_at,-id');
  });
  it('validates group responses and normalizes unknown URL periods', async () => {
    expect(historyPeriod('unknown')).toBe('all');
    for (const data of [null, {}, [{ kon: false, count: 1 }], [{ kon: 5, count: 0 }], [{ kon: 'bad', count: 1 }]]) {
      context.get.mockResolvedValueOnce({ data });
      await expect(historyKons('duel', 'all', 'history')).rejects.toThrow('invalid-response');
    }
  });
});

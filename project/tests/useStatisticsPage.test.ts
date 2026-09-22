import { effectScope, nextTick, reactive, type EffectScope } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStatisticsPage } from '../src/hooks/useStatisticsPage';
import { apiClient } from '../src/services/httpClient';

const context = vi.hoisted(() => ({ route: null as any, router: null as any }));
vi.mock('vue-router', () => ({ useRoute: () => context.route, useRouter: () => context.router }));
let scope: EffectScope;
const emptyRanking = { data: { items: [] as Array<{ id: number; username: string }>, _meta: { totalCount: 0, pageCount: 0, currentPage: 1, perPage: 20 } }, headers: {} };
const summary = { data: { users: 0, games: { orel: 0, saper: 0 }, forum: { themes: 0, comments: 0 }, exchange: 0 } };
const flush = async () => { for (let i = 0; i < 8; i++) { await nextTick(); await Promise.resolve(); } };

beforeEach(() => {
  context.route = reactive({ path: '/statistic', query: { page: '3', period: 'week', q: 'alice' }, hash: '' });
  context.router = { push: vi.fn(async target => { context.route.query = target.query; }) };
  vi.spyOn(apiClient, 'get').mockImplementation(async url => String(url).endsWith('/stat') ? summary : emptyRanking);
  scope = effectScope();
});
afterEach(() => { scope.stop(); vi.restoreAllMocks(); });

describe('statistics page interactions', () => {
  it('changes the URL and request period, resets pagination and restores browser history', async () => {
    const state = scope.run(useStatisticsPage)!;
    await flush();
    expect(state.filters.value.period).toBe('week');
    state.choosePeriod('day'); await flush();
    expect(context.route.query).toEqual({ period: 'day', q: 'alice' });
    expect(apiClient.get).toHaveBeenLastCalledWith(expect.stringMatching(/stat\/top$/), {
      params: { envelope: 1, page: 1, 'per-page': 10, q: 'alice', sort: '-rating', period: 'day', 'filter[period]': undefined },
    });
    const count = vi.mocked(apiClient.get).mock.calls.length;
    state.choosePeriod('day'); await flush();
    expect(vi.mocked(apiClient.get).mock.calls).toHaveLength(count);
    context.route.query = { page: '3', period: 'week', q: 'alice' }; await flush();
    expect(state.filters.value.period).toBe('week');
    expect(state.page.value).toBe(3);
    state.reset(); await flush();
    expect(context.route.query).toEqual({});
    expect(state.filters.value.period).toBe('all');
  });
  it('keeps the latest period after a delayed old response and supports retry after error', async () => {
    let oldReply!: (response: typeof emptyRanking) => void;
    vi.mocked(apiClient.get).mockImplementation(async url => String(url).endsWith('/stat') ? summary : new Promise(resolve => { oldReply = resolve; }));
    const state = scope.run(useStatisticsPage)!;
    await flush();
    vi.mocked(apiClient.get).mockResolvedValue(emptyRanking);
    state.choosePeriod('month'); await flush();
    oldReply({ data: { items: [{ id: 1, username: 'stale' }], _meta: { totalCount: 1, pageCount: 1, currentPage: 1, perPage: 20 } }, headers: {} });
    await flush();
    expect(state.ranking.data.value.items).toEqual([]);
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('offline'));
    state.choosePeriod('half-year'); await flush();
    expect(state.ranking.error.value).not.toBe('');
    expect(state.ranking.loading.value).toBe(false);
    await state.ranking.refresh();
    expect(state.ranking.error.value).toBe('');
    expect(state.ranking.data.value.items).toEqual([]);
  });
});

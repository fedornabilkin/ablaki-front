import { effectScope, nextTick, reactive, type EffectScope } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useListQuery, queryPage, queryText } from '../src/hooks/useListQuery';

const context = vi.hoisted(() => ({ route: null as any, router: null as any }));
vi.mock('vue-router', () => ({ useRoute: () => context.route, useRouter: () => context.router }));
let scope: EffectScope;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  context.route = reactive({ path: '/games/orel', query: { page: '3', kon: '5', q: 'alice', online: '1' }, hash: '' });
  context.router = { push: vi.fn(async target => { context.route.query = target.query; }) };
  scope = effectScope();
});
afterEach(() => { scope.stop(); vi.useRealTimers(); });
const flush = async () => { await nextTick(); await Promise.resolve(); await nextTick(); };

describe('list URL state', () => {
  it('restores search, filters, page and default newest sort from a shared URL', () => {
    const state = scope.run(() => useListQuery({ kon: '' }))!;
    expect(state.page.value).toBe(3);
    expect(state.search.value).toBe('alice');
    expect(state.params.value).toEqual({ q: 'alice', sort: '-id', 'filter[kon]': '5' });
  });
  it('debounces edits and resets page only when applying search', async () => {
    const state = scope.run(() => useListQuery({ kon: '' }))!;
    state.search.value = 'bob'; await flush();
    await vi.advanceTimersByTimeAsync(200);
    state.search.value = 'bobby'; await flush();
    await vi.advanceTimersByTimeAsync(349);
    expect(context.router.push).not.toHaveBeenCalled();
    expect(state.params.value.q).toBe('alice');
    await vi.advanceTimersByTimeAsync(1); await flush();
    expect(context.router.push).toHaveBeenCalledOnce();
    expect(context.route.query).toEqual({ kon: '5', q: 'bobby', online: '1' });
    expect(state.page.value).toBe(1);
  });
  it('restores browser history and cancels a pending draft after navigation', async () => {
    const state = scope.run(() => useListQuery({ kon: '' }))!;
    state.search.value = 'pending'; await flush();
    context.route.query = { page: '2', q: 'previous', kon: '10' }; await flush();
    await vi.advanceTimersByTimeAsync(500);
    expect(state.search.value).toBe('previous');
    expect(state.page.value).toBe(2);
    expect(state.filters.value.kon).toBe('10');
    expect(context.router.push).not.toHaveBeenCalled();
  });
  it('keeps other lists and unrelated query keys on filter changes and reset', async () => {
    context.route.query = { page: '3', q: 'alice', recent_page: '4', recent_kon: '5', online: '1' };
    const state = scope.run(() => useListQuery({ kon: '' }, { prefix: 'recent' }))!;
    state.filters.value = { kon: '10' }; await flush();
    expect(context.route.query).toEqual({ page: '3', q: 'alice', recent_kon: '10', online: '1' });
    state.reset(); await flush();
    expect(context.route.query).toEqual({ page: '3', q: 'alice', online: '1' });
  });
  it('cancels pending search when its owner is removed', async () => {
    const state = scope.run(() => useListQuery())!;
    state.search.value = 'pending'; await flush(); scope.stop();
    await vi.advanceTimersByTimeAsync(500);
    expect(context.router.push).not.toHaveBeenCalled();
  });
  it('does not reissue a list query when a separate list changes its URL state', async () => {
    const state = scope.run(() => useListQuery({ kon: '' }))!;
    const original = state.params.value;
    context.route.query = { ...context.route.query, recent_page: '5' }; await flush();
    expect(state.params.value).toBe(original);
  });
  it('normalizes untrusted query values', () => {
    for (const value of ['-1', '0', '1.5', 'Infinity', ['2'], '1000001']) expect(queryPage(value)).toBe(1);
    expect(queryText(['bad'])).toBe('');
    expect(queryText('x'.repeat(110))).toHaveLength(100);
  });
});

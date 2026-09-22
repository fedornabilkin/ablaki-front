import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createRenderer, h, reactive, ref, ssrContextKey, type App } from 'vue';
import Transfers from '../src/components/pages/user/Transfers.vue';
const context = vi.hoisted(() => ({ store: null as any, state: null as any, mutate: vi.fn(), refresh: vi.fn() }));
vi.mock('vuex', () => ({ useStore: () => context.store }));
vi.mock('../src/hooks/useListQuery', () => ({ useListQuery: () => ({ page: ref(1), filters: ref({ mode: 'active' }), params: ref({}) }) }));
vi.mock('../src/hooks/usePageRequest', () => ({ usePageRequest: () => ({ data: ref({ items: [], total: 0, pageSize: 20 }), loading: ref(false), error: ref(''), refresh: context.refresh }) }));
vi.mock('../src/services/api/portal', async original => ({ ...await original(), mutate: context.mutate }));
const renderer = createRenderer({
  createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
  setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
  insert: () => {}, remove: () => {}, patchProp: () => {},
});
let app: App;
afterEach(() => app.unmount());
beforeEach(async () => {
  context.store = reactive({ state: { auth: { revision: 1 } }, getters: { 'auth/user': { id: 37, person: { credit: 12 } } }, dispatch: vi.fn().mockResolvedValue(null) });
  context.mutate.mockReset(); context.refresh.mockReset();
  app = renderer.createApp({ setup(props, ctx) { context.state = (Transfers as any).setup(props, ctx); return () => h('div'); } });
  app.provide(ssrContextKey, { modules: new Set() });
  app.mount({});
});
it('previews an affordable partial batch and sends the requested count to the server', async () => {
  const state = context.state;
  state.amount.value = 5; state.count.value = 10;
  expect(state.creatable.value).toBe(2); expect(state.canCreate.value).toBe(true);
  context.mutate.mockResolvedValue({ created: 1, requested: 10, amount: 5, total: 5 });
  await state.act('transfer', 'post', { amount: state.amount.value, count: state.count.value });
  expect(context.mutate).toHaveBeenCalledExactlyOnceWith('transfer', 'post', { amount: 5, count: 10 });
  expect(state.notice.value).toBe('Создано переводов: 1 из 10.');
  expect(context.store.dispatch).toHaveBeenCalledWith('auth/fetchData');
});
it('rejects invalid quantities and prevents duplicate submission while a batch is pending', async () => {
  const state = context.state;
  for (const [amount, count] of [[13, 1], [1.5, 2], [5, 0], [1, 101]]) {
    state.amount.value = amount; state.count.value = count;
    await state.act('transfer', 'post', { amount, count });
  }
  expect(context.mutate).not.toHaveBeenCalled();
  state.amount.value = 5; state.count.value = 2;
  let resolve!: (value: unknown) => void;
  context.mutate.mockImplementation(() => new Promise(done => { resolve = done; }));
  const first = state.act('transfer', 'post', { amount: 5, count: 2 });
  await state.act('transfer', 'post', { amount: 5, count: 2 });
  expect(context.mutate).toHaveBeenCalledTimes(1);
  context.store.state.auth.revision++;
  resolve({ created: 2, requested: 2 }); await first;
  expect(state.notice.value).toBe(''); expect(context.store.dispatch).not.toHaveBeenCalled();
});

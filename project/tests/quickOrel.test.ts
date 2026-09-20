import { beforeEach, it, expect, vi } from 'vitest';
import { createSSRApp, h, reactive, ref, nextTick } from 'vue';
import { renderToString } from '@vue/server-renderer';
import GameLobby from '../src/components/pages/games/GameLobby.vue';
const context = vi.hoisted(() => ({ route: null as any, store: null as any, page: null as any, state: null as any, mutate: vi.fn(), refresh: vi.fn() }));
vi.mock('vue-router', () => ({ useRoute: () => context.route }));
vi.mock('vuex', () => ({ useStore: () => context.store }));
vi.mock('../src/hooks/useListQuery', () => ({ useListQuery: () => ({ page: ref(1), search: ref(''), filters: ref({}), params: ref({}), reset: () => {} }) }));
vi.mock('../src/hooks/usePageRequest', () => ({ usePageRequest: (_load, initial) => ({ data: initial === null ? ref(null) : context.page, loading: ref(false), error: ref(''), refresh: context.refresh }) }));
vi.mock('../src/services/api/portal', async original => ({ ...await original(), mutate: context.mutate }));
const flush = async () => { for (let i = 0; i < 8; i++) { await Promise.resolve(); await nextTick(); } };
beforeEach(async () => {
  context.route = reactive({ path: '/games/orel', fullPath: '/games/orel', query: {} });
  context.store = reactive({ state: { auth: { revision: 1 } }, getters: { 'auth/user': { id: 37, person: { credit: 100 } } }, dispatch: vi.fn().mockResolvedValue(null) });
  context.page = ref({ items: [{ id: 9, user_id: 38, username: 'Test02', kon: 5, created_at: 1 }], total: 1, pageSize: 20, currentPage: 1, pageCount: 1 });
  context.mutate.mockReset(); context.refresh.mockReset();
  // Run the real page setup inside Vue's lifecycle; API and route are isolated fixtures.
  const subject = { setup(props, ctx) { context.state = (GameLobby as any).setup(props, ctx); return () => h('div'); } };
  await renderToString(createSSRApp(subject));
});
it('plays inline once and retains the completed row without selecting a modal game', async () => {
  let complete!: (value: any) => void;
  context.mutate.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  const game = context.page.value.items[0];
  context.state.quickPlay(game, 1); context.state.quickPlay(game, 1);
  expect(context.mutate).toHaveBeenCalledExactlyOnceWith('orel/play/9', 'post', { hod: 1 });
  expect(context.state.selected.value).toBeNull();
  complete({ game: { win: true } }); await flush();
  expect(context.state.playedRows.value[9]).toBe('Вы выиграли!');
  expect(context.page.value.items[0]).toEqual(game);
  context.state.quickPlay(game, 2); expect(context.mutate).toHaveBeenCalledTimes(1); expect(context.refresh).not.toHaveBeenCalled();
  expect(context.store.dispatch).toHaveBeenCalledWith('auth/fetchData');
});
it('keeps a failed row playable and ignores a response belonging to another session', async () => {
  const game = context.page.value.items[0];
  context.mutate.mockRejectedValueOnce(new Error('offline')); context.state.quickPlay(game, 1); await flush();
  expect(context.state.busy.value).toBe(false); expect(context.state.playedRows.value[9]).toBeUndefined();
  let complete!: (value: any) => void; context.mutate.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  context.state.quickPlay(game, 2); context.store.state.auth.revision++; complete({ game: { win: false } }); await flush();
  expect(context.state.playedRows.value[9]).toBeUndefined(); expect(context.store.dispatch).not.toHaveBeenCalled();
});
it('refuses insufficient balance and invalid coin sides', () => {
  const game = context.page.value.items[0]; context.state.quickPlay(game, 3);
  context.store.getters['auth/user'].person.credit = 0; context.state.quickPlay(game, 1);
  expect(context.mutate).not.toHaveBeenCalled();
});

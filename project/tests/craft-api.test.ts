import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createPinia, setActivePinia} from 'pinia';

const {get, post, dispatch} = vi.hoisted(() => ({get: vi.fn(), post: vi.fn(), dispatch: vi.fn()}));
vi.mock('@/services/httpClient', () => ({apiClient: {get, post}}));
vi.mock('@/store/store', () => ({store: {
  getters: {'auth/user': {person: {credit: 500}}}, dispatch,
}}));
// An old mock setting must never enable account purchases.
vi.mock('@/services/craft/mock', () => ({isCraftMockMode: () => true}));

import {itemApi, recipeApi, inventoryApi, craftApi, shopApi} from '../src/services/api/craft';
import {useCraftStore} from '../src/store/craft';

beforeEach(() => {
  vi.clearAllMocks();
  setActivePinia(createPinia());
});

describe('unavailable account craft API', () => {
  it('rejects reads and commands without contacting unimplemented endpoints', async () => {
    const operations = [
      itemApi.index(), recipeApi.index(), recipeApi.view(3),
      inventoryApi.my(), craftApi.execute(3), shopApi.list(), shopApi.buy(5, 2),
    ];
    for (const operation of operations) {
      await expect(operation).rejects.toMatchObject({code: 'CRAFT_UNAVAILABLE'});
    }
    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it('does not debit account credits or replace inventory when a stale shop invokes purchase', async () => {
    const store = useCraftStore();
    store.shop = [{id: 5, price_credits: 10}];
    store.inventory = [{item: {id: 5}, qty: 3}];
    await store.buyMaterial(5, 2);
    expect(dispatch).not.toHaveBeenCalled();
    expect(store.inventory).toEqual([{item: {id: 5}, qty: 3}]);
    expect(store.lastPurchase).toBeNull();
    expect(store.lastError).toContain('Крафт аккаунта пока недоступен');
    expect(store.buying).toBeNull();
  });

  it('finishes loading and crafting with errors and no fabricated result', async () => {
    const store = useCraftStore();
    await store.load();
    expect(store.loading).toBe(false);
    expect(store.loaded).toBe(false);
    expect(store.loadError).toBeTruthy();
    await store.craft(3);
    expect(store.crafting).toBeNull();
    expect(store.lastResult).toBeNull();
    expect(store.lastError).toBeTruthy();
  });
});

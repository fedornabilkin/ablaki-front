import {beforeEach, describe, expect, it, vi} from 'vitest';
import {getCraftMockBackend} from '../src/services/craft/mock';
import Recipe from '../src/entities/craft/recipe';

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
  getCraftMockBackend().reset();
});

describe('crafting', () => {
  it('consumes a stick and coal and adds one torch', async () => {
    const backend = getCraftMockBackend();
    const items = await backend.listItems();
    const stick = items.find(item => item.code === 'sticks')!;
    const coal = items.find(item => item.code === 'coal')!;
    await backend.addMaterial(stick.id, 2);
    await backend.addMaterial(coal.id, 1);
    const result = await backend.execute(1);
    expect(result.result_item.code).toBe('torch');
    expect(result.qty).toBe(1);
    expect(result.inventory.map(entry => [entry.item.code, entry.qty])).toEqual([
      ['sticks', 1], ['torch', 1],
    ]);
    const inventory = await backend.myInventory();
    await expect(backend.execute(1)).rejects.toMatchObject({errors: {reason: expect.stringContaining('Уголь')}});
    expect(await backend.myInventory()).toEqual(inventory);
  });

  it('requires enough credits as well as materials', () => {
    const recipe = new Recipe();
    recipe.cost_credits = 5;
    expect(recipe.canCraft(new Map(), 4).ok).toBe(false);
    expect(recipe.canCraft(new Map(), 5).ok).toBe(true);
  });
});

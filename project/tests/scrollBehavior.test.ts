import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { scrollBehavior } from '../src/services/scrollBehavior';

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:page', component: {} }] });
describe('list navigation scroll', () => {
  it('keeps scroll when filters or pagination change on the same page', () => {
    expect(scrollBehavior(router.resolve('/users?q=alice'), router.resolve('/users?page=5'), null)).toBe(false);
    expect(scrollBehavior(router.resolve('/games?kon=5'), router.resolve('/games?kon=10'), null)).toBe(false);
  });
  it('restores browser history and scrolls a different page to the top', () => {
    const saved = { left: 0, top: 725 };
    expect(scrollBehavior(router.resolve('/users'), router.resolve('/users?page=2'), saved)).toEqual(saved);
    expect(scrollBehavior(router.resolve('/users'), router.resolve('/forum'), null)).toEqual({ top: 0 });
  });
});

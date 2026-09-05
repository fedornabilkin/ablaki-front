import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { routes } from '../src/routes';
const router = createRouter({ history: createMemoryHistory(), routes });
describe('portal route access', () => {
  it.each(['/forum/my', '/users/profile', '/balance', '/rating', '/transfer', '/games/orel', '/games/orel/my', '/games/saper', '/exchange/my'])('requires a verified session for %s', path => {
    expect(router.resolve(path).matched.some(record => record.meta.requiresAuth)).toBe(true);
  });
  it.each(['/', '/games', '/forum', '/forum/read/1', '/users', '/wall/preview'])('allows public discovery of %s', path => {
    const resolved = router.resolve(path);
    expect(resolved.matched.length).toBeGreaterThan(0);
    expect(resolved.matched.some(record => record.meta.requiresAuth)).toBe(false);
    expect(resolved.matched[0].path).not.toContain('pathMatch');
  });
  it('does not attach the orlyanka history to saper', () => {
    expect(router.resolve('/games/saper/history').matched[0].redirect).toBe('/balance');
  });
});

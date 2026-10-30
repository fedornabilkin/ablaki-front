import { scrollBehavior } from '../src/services/scrollBehavior';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { routes } from '../src/routes';
import WorldPage from '../src/components/pages/world/WorldPage.vue';
import { legacyCraftLocation, workspaceNode } from '../src/entities/world/workspaceNavigation';
vi.mock('../src/components/pages/world/WorldPage.vue', () => ({ default: { name: 'WorldRouteScreen' } }));
const router = createRouter({ history: createMemoryHistory(), routes });
describe('portal route access', () => {
  it.each(['/world', '/world/nodes/21'])('opens the interactive world screen at %s', async path => {
    const resolved = router.resolve(path);
    expect(resolved.meta.requiresAuth).toBe(true);
    const load = resolved.matched[0].components!.default as () => Promise<{ default: { __name: string } }>;
    expect((await load()).default).toBe(WorldPage);
  });
  it('keeps the old craft address as an authenticated redirect', () => {
    expect(router.resolve('/craft').meta.requiresAuth).toBe(true);
    expect(router.resolve('/craft').matched[0].redirect).toBe(legacyCraftLocation);
    expect(router.resolve('/forum').meta.hideBreadcrumbs).toBeUndefined();
  });
  it.each(['inventory', 'recipes', 'map', 'history'])('opens the distinct workspace section %s', section => {
    const resolved = router.resolve(`/world/workspace/${section}`);
    expect(resolved.meta.requiresAuth).toBe(true);
    expect(resolved.meta.workspaceSection).toBe(section);
    expect(resolved.params.id).toBeUndefined();
  });
  it('keeps numeric workspace routes for manufacturing in a specific object', () => {
    expect(router.resolve('/world/workspace/12').params.id).toBe('12');
    expect(router.resolve('/world/workspace/12').meta.workspaceSection).toBeUndefined();
    expect(router.resolve('/world/workspace/missing').matched[0].path).toContain('pathMatch');
  });
  it('preserves old recipe and object links without admitting malformed node IDs', () => {
    expect(legacyCraftLocation({ query: { item: '17' }, hash: '' })).toEqual({ path: '/world/workspace/map', query: { item: '17' }, hash: '' });
    expect(legacyCraftLocation({ query: { node: '12', recipe_id: '5' }, hash: '#recipe' })).toEqual({ path: '/world/workspace/12', query: { recipe_id: '5' }, hash: '#recipe' });
    expect(legacyCraftLocation({ query: { tab: 'history' }, hash: '' }).path).toBe('/world/workspace/history');
    expect(workspaceNode('12/nope')).toBeUndefined();
    expect(workspaceNode(['12'])).toBeUndefined();
    expect(workspaceNode('99999999999')).toBeUndefined();
  });
  it.each(['/world/character', '/world/storage/21', '/world/workspace/21', '/world/workspace/inventory', '/world/equipment/21/wear', '/world/recovery', '/forum/my', '/users/profile', '/users/referrals', '/balance', '/rating', '/transfer', '/games/five', '/games/five/my', '/games/five/history', '/games/duel/history', '/games/orel/history', '/games/orel', '/games/orel/my', '/games/saper', '/games/saper/my', '/games/saper/history', '/exchange/my'])('requires a verified session for %s', path => {
    expect(router.resolve(path).matched.some(record => record.meta.requiresAuth)).toBe(true);
  });
  it.each(['/', '/games', '/forum', '/forum/read/1', '/users', '/wall/preview', '/statistic'])('allows public discovery of %s', path => {
    const resolved = router.resolve(path);
    expect(resolved.matched.length).toBeGreaterThan(0);
    expect(resolved.matched.some(record => record.meta.requiresAuth)).toBe(false);
    expect(resolved.matched[0].path).not.toContain('pathMatch');
  });
  it('does not attach the orlyanka history to saper', () => {
    expect(router.resolve('/games/saper/history').matched[0].redirect).toBeUndefined();
    expect(router.resolve('/games/saper/history').meta.requiresAuth).toBe(true);
  });
});

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

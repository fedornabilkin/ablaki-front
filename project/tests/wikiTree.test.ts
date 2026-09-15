import { describe, expect, it } from 'vitest';
import { buildWikiTree, WikiMenuVisitor, WikiPathVisitor } from '../src/entities/wiki/tree';
describe('Wiki composite and visitors', () => {
  it('builds nested categories and pages with separate IDs, navigation and breadcrumbs', () => {
    const roots = buildWikiTree([{ id: 2, parent: 1, name: 'Игры' }, { id: 1, parent: 0, name: 'Wiki' }], [{ id: 1, catid: 2, title: 'Дуэль' }]);
    expect(roots[0].accept(new WikiMenuVisitor()).children?.[0].children?.[0].to).toBe('/wiki/read/1');
    expect(roots[0].accept(new WikiPathVisitor('article-1')).map(item => item.title)).toEqual(['Wiki', 'Игры', 'Дуэль']);
    expect(roots[0].accept(new WikiPathVisitor('missing'))).toEqual([]);
  });
  it('rejects cycles, orphaned categories, duplicates and pages without categories', () => {
    expect(() => buildWikiTree([{ id: 1, parent: 2, name: 'A' }, { id: 2, parent: 1, name: 'B' }], [])).toThrow('category-cycle');
    expect(() => buildWikiTree([{ id: 1, parent: 1, name: 'A' }], [])).toThrow('category-cycle');
    expect(() => buildWikiTree([{ id: 1, parent: 7, name: 'A' }], [])).toThrow('missing-parent');
    expect(() => buildWikiTree([{ id: 1, parent: 0, name: 'A' }, { id: 1, parent: 0, name: 'B' }], [])).toThrow('invalid-category');
    expect(() => buildWikiTree([], [{ id: 1, catid: 7, title: 'A' }])).toThrow('invalid-article');
    expect(buildWikiTree([], [])).toEqual([]);
  });
});

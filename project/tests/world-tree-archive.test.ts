import { describe, expect, it } from 'vitest';
import { mergeWorldTree, treeNode } from '../src/entities/world/tree';
import type { WorldNode, WorldTreeNode } from '../src/entities/world/types';
function branch(id: number, status = 'active', parent: number | null = null): WorldTreeNode {
  return treeNode({ id, parent_id: parent, root_id: 1, type: 'ROOM', name: 'Node', label: 'Node', status, visibility: 'public', revision: 1, portable: false, coordinates: { x: 0, y: 0 }, footprint: null, child_count: 0, descendant_count: 0, population_total: 0, owned_by_me: true, details: {}, permissions: { administer: false, manage: true, storage: true }, actions: [] } as WorldNode);
}
describe('archived world children', () => {
  it('removes an archived child from the reactive map and index without replacing the parent array', () => {
    const index = new Map<number, WorldTreeNode>();
    const parent = branch(8); parent.children = [branch(21, 'constructing', 8)]; parent.children_loaded = true;
    const target = mergeWorldTree(index, parent), cells = target.children;
    const refreshed = branch(8); refreshed.revision = 2; refreshed.children_loaded = true; refreshed.children = [branch(21, 'archived', 8)];
    mergeWorldTree(index, refreshed);
    expect(target.children).toBe(cells);
    expect(cells).toHaveLength(0);
    expect(index.has(21)).toBe(false);
    expect(index.get(8)).toBe(target);
  });
  it('does not add archived children even if an old administrative API includes them', () => {
    const index = new Map<number, WorldTreeNode>();
    const parent = branch(8); parent.children = [branch(21, 'archived', 8), branch(20, 'active', 8)]; parent.children_loaded = true;
    const target = mergeWorldTree(index, parent);
    expect(target.children.map(child => child.id)).toEqual([20]);
    expect(index.has(21)).toBe(false);
  });
  it('removes explicit archived children from a partial branch but keeps unrelated siblings', () => {
    const index = new Map<number, WorldTreeNode>();
    const parent = branch(8); parent.children = [branch(21, 'constructing', 8), branch(20, 'active', 8)]; parent.children_loaded = true;
    const target = mergeWorldTree(index, parent);
    const partial = branch(8); partial.children_loaded = false; partial.children = [branch(21, 'archived', 8)]; partial.children[0].revision = 2;
    mergeWorldTree(index, partial);
    expect(target.children.map(child => child.id)).toEqual([20]);
    expect(index.has(21)).toBe(false);
  });
});

import type { WorldTreeNode } from './types';

/** The loaded composite is a projection, never a claim that the whole world is loaded. */
export interface WorldVisitor {
  enter(node: WorldTreeNode, depth: number): void | false;
  leave?(node: WorldTreeNode, depth: number): void;
}

/** No I/O or implicit writes. A visitor may prune a branch by returning false. */
export function visitWorldTree(root: WorldTreeNode, visitor: WorldVisitor): void {
  const seen = new Set<number>();
  function visit(node: WorldTreeNode, depth: number): void {
    if (depth > 32 || seen.size >= 10000 || seen.has(node.id)) throw new Error('Invalid world tree');
    seen.add(node.id);
    if (visitor.enter(node, depth) === false) return;
    for (const child of node.children) visit(child, depth + 1);
    visitor.leave?.(node, depth);
  }
  visit(root, 0);
}

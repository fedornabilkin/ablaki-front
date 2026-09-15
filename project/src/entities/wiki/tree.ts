export interface WikiVisitor<T> {
  category(node: WikiCategory): T;
  article(node: WikiArticle): T;
}
export interface WikiNode {
  readonly id: number;
  readonly title: string;
  accept<T>(visitor: WikiVisitor<T>): T;
}
export class WikiArticle implements WikiNode {
  constructor(readonly id: number, readonly title: string) {}
  accept<T>(visitor: WikiVisitor<T>): T { return visitor.article(this); }
}
export class WikiCategory implements WikiNode {
  readonly children: readonly WikiNode[];
  constructor(readonly id: number, readonly title: string, children: readonly WikiNode[]) {
    this.children = Object.freeze([...children]);
  }
  accept<T>(visitor: WikiVisitor<T>): T { return visitor.category(this); }
}
export interface CategoryRow { id: number; name: string; parent: number | null; }
export interface ArticleRow { id: number; title: string; catid: number; }

/** Composite built from flat API rows. Invalid ancestry fails instead of looping or silently losing pages. */
export function buildWikiTree(categories: readonly CategoryRow[], articles: readonly ArticleRow[]): readonly WikiCategory[] {
  const byId = new Map<number, CategoryRow>();
  for (const row of categories) {
    if (!Number.isSafeInteger(row.id) || row.id < 1 || typeof row.name !== 'string' || !row.name.trim() || byId.has(row.id)
      || (row.parent !== null && (!Number.isSafeInteger(row.parent) || row.parent < 0))) throw new Error('invalid-category');
    byId.set(row.id, row);
  }
  const children = new Map<number, CategoryRow[]>();
  for (const row of categories) {
    const parent = row.parent || 0;
    if (parent && !byId.has(parent)) throw new Error('missing-parent');
    children.set(parent, [...(children.get(parent) || []), row]);
    const ancestors = new Set<number>([row.id]);
    let current = parent;
    while (current) {
      if (ancestors.has(current)) throw new Error('category-cycle');
      ancestors.add(current);
      if (ancestors.size > 100) throw new Error('category-depth');
      current = byId.get(current)?.parent || 0;
    }
  }
  const pages = new Map<number, WikiArticle[]>(), pageIds = new Set<number>();
  for (const row of articles) {
    if (!Number.isSafeInteger(row.id) || row.id < 1 || pageIds.has(row.id) || !byId.has(row.catid) || typeof row.title !== 'string' || !row.title.trim()) throw new Error('invalid-article');
    pageIds.add(row.id);
    pages.set(row.catid, [...(pages.get(row.catid) || []), new WikiArticle(row.id, row.title)]);
  }
  const build = (row: CategoryRow): WikiCategory => new WikiCategory(row.id, row.name, [
    ...(children.get(row.id) || []).map(build), ...(pages.get(row.id) || []),
  ]);
  return Object.freeze((children.get(0) || []).map(build));
}
export interface WikiMenuItem { key: string; title: string; to: string; children?: WikiMenuItem[]; }
export class WikiMenuVisitor implements WikiVisitor<WikiMenuItem> {
  category(node: WikiCategory): WikiMenuItem {
    return { key: `category-${node.id}`, title: node.title, to: `/wiki/cat/${node.id}`, children: node.children.map(child => child.accept(this)) };
  }
  article(node: WikiArticle): WikiMenuItem {
    return { key: `article-${node.id}`, title: node.title, to: `/wiki/read/${node.id}` };
  }
}
/** A second operation over the same composite: find the breadcrumb path. */
export class WikiPathVisitor implements WikiVisitor<WikiMenuItem[]> {
  private menu = new WikiMenuVisitor();
  constructor(private readonly key: string) {}
  category(node: WikiCategory): WikiMenuItem[] {
    const item = node.accept(this.menu);
    if (item.key === this.key) return [item];
    for (const child of node.children) {
      const path = child.accept(this);
      if (path.length) return [item, ...path];
    }
    return [];
  }
  article(node: WikiArticle): WikiMenuItem[] {
    const item = node.accept(this.menu);
    return item.key === this.key ? [item] : [];
  }
}

import type { RouteLocationNormalized, LocationQuery } from 'vue-router';

export const workspaceSections = [
  { id: 'inventory', title: 'Инвентарь' },
  { id: 'recipes', title: 'Рецепты' },
  { id: 'map', title: 'Карта рецептов' },
  { id: 'history', title: 'История' },
] as const;
export function workspaceNode(value: unknown): number | undefined {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number(value) <= 2147483647 ? Number(value) : undefined;
}
export function legacyCraftLocation(route: Pick<RouteLocationNormalized, 'query' | 'hash'>) {
  const { node, tab, ...query } = route.query;
  const id = workspaceNode(node);
  const section = workspaceSections.find(s => s.id === tab)?.id ?? (query.item ? 'map' : 'recipes');
  return { path: id ? `/world/workspace/${id}` : `/world/workspace/${section}`, query, hash: route.hash };
}
export function workspaceQuery(nodeId?: number): LocationQuery {
  return nodeId ? { node: String(nodeId) } : {};
}

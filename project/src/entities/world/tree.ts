import { reactive } from 'vue';
import type { WorldNode, WorldScreen, WorldTreeNode } from './types';

export function treeNode(node: WorldNode): WorldTreeNode {
  return { ...node, children: [], children_loaded: node.child_count === 0,
    geo: { coordinates: node.coordinates, footprint: node.footprint },
    state: { status: node.status, visibility: node.visibility, revision: node.revision, portable: node.portable, details: node.details, permissions: node.permissions, actions: node.actions },
    construction: { condition: typeof node.details.condition === 'number' ? node.details.condition : null, max_condition: typeof node.details.max_condition === 'number' ? node.details.max_condition : null, repair_active: node.details.repair_active === true },
    owner: node.owner ?? { id: null, owned_by_me: node.owned_by_me, has_finances: node.has_finances } };
}

/** Compatibility with the previous page envelope; the store still has one canonical tree. */
export function screenTree(screen: WorldScreen): WorldTreeNode | null {
  if (screen.world !== undefined) return screen.world;
  if (!screen.navigation) return null;
  const nav = screen.navigation, index = new Map<number, WorldTreeNode>();
  for (const node of [...nav.breadcrumbs, ...nav.siblings.items, ...(screen.map?.items ?? []), nav.node]) index.set(node.id, treeNode(node));
  for (const node of index.values()) if (node.parent_id !== null) index.get(node.parent_id)?.children.push(node);
  const focus = index.get(nav.node.id)!;
  focus.children_loaded = true;
  if (screen.map && focus.map) Object.assign(focus.map, { cells: screen.map.cells, equipment_cells: screen.map.equipment_cells, can_expand: screen.map.can_expand, exploration: screen.map.exploration, pricing: screen.map.pricing });
  return index.get(nav.breadcrumbs[0]?.id ?? nav.node.id)!;
}

/** Mutate records and arrays in place so existing Vue consumers keep their references. */
function patch(target: Record<string, unknown>, source: Record<string, unknown>) {
  for (const key of Object.keys(target)) if (!(key in source)) delete target[key];
  for (const [key, value] of Object.entries(source)) {
    const previous = target[key];
    if (Array.isArray(value) && Array.isArray(previous)) previous.splice(0, previous.length, ...value);
    else if (value && previous && typeof value === 'object' && typeof previous === 'object' && !Array.isArray(value) && !Array.isArray(previous)) patch(previous as Record<string, unknown>, value as Record<string, unknown>);
    else target[key] = value;
  }
}

export function mergeWorldTree(index: Map<number, WorldTreeNode>, incoming: WorldTreeNode): WorldTreeNode {
  const received = new Set<number>(), parents = new Map<number, number | null>();
  function collect(node: WorldTreeNode) {
    received.add(node.id);
    const existing = index.get(node.id), older = existing && node.revision < existing.revision;
    parents.set(node.id, older ? existing.parent_id : node.parent_id);
    node.children.filter(child => child.status !== 'archived' && (!older || existing.children.some(known => known.id === child.id))).forEach(collect);
  }
  collect(incoming);
  function remove(node: WorldTreeNode) { if (received.has(node.id)) return; node.children.forEach(remove); index.delete(node.id); }
  function merge(source: WorldTreeNode): WorldTreeNode {
    let target = index.get(source.id);
    if (!target) { target = reactive({ ...source, children: [] }) as WorldTreeNode; index.set(source.id, target); }
    const current = source.revision >= target.revision;
    if (!current) {
      // An old complete list cannot resurrect a child removed by a newer parent revision.
      source.children.filter(child => child.status !== 'archived' && target!.children.some(known => known.id === child.id)).forEach(merge);
      return target;
    }
    if (current) {
      const { children: _children, children_loaded: _loaded, map: sourceMap, ...fields } = source;
      const { children: savedChildren, children_loaded: loaded, map: savedMap } = target;
      // Preserve the separately loaded map of a visited ancestor on partial snapshots.
      const map = sourceMap && savedMap && sourceMap.cells === undefined && source.permissions.storage === target.permissions.storage && source.owned_by_me === target.owned_by_me ? { ...savedMap, ...sourceMap } : sourceMap;
      const updated = { ...fields, children: savedChildren, children_loaded: loaded, ...(map ? { map } : {}) };
      patch(target as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
      target.coordinates = target.geo.coordinates; target.footprint = target.geo.footprint;
      target.details = target.state.details; target.permissions = target.state.permissions; target.actions = target.state.actions;
    }
    // Explicit archive records are deletions even when this branch is only partially loaded.
    const archived = new Set(source.children.filter(child => child.status === 'archived' && child.revision >= (index.get(child.id)?.revision ?? 0)).map(child => child.id));
    target.children.filter(child => archived.has(child.id)).forEach(remove);
    if (archived.size) target.children.splice(0, target.children.length, ...target.children.filter(child => !archived.has(child.id)));
    const nested = source.children.filter(child => child.status !== 'archived').map(merge);
    if (current && source.children_loaded) {
      const keep = new Set(nested.map(child => child.id));
      target.children.filter(child => !keep.has(child.id)).forEach(remove);
      target.children.splice(0, target.children.length, ...nested); target.children_loaded = true;
    } else {
      const merged = new Map(target.children.map(child => [child.id, child]));
      nested.forEach(child => merged.set(child.id, child));
      target.children.splice(0, target.children.length, ...[...merged.values()].filter(child => (parents.has(child.id) ? parents.get(child.id) : child.parent_id) === target!.id));
      if (current && target.children.length !== target.child_count) target.children_loaded = false;
    }
    return target;
  }
  return merge(incoming);
}

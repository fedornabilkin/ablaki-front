import type { WorldCapabilities, WorldNode } from './types';

export type NodeTab = 'map' | 'workshop' | 'finance';

export interface NodeFeatureSet {
  storage: boolean;
  manufacturing: boolean;
  nights: boolean;
  housing: boolean;
  finance: boolean;
  cultivation: boolean;
}

export const tabLabels: Record<NodeTab, string> = {
  map: 'Карта', workshop: 'Вещи и крафт', finance: 'Казна',
};

export function nodeFeatures(node: WorldNode, capabilities: WorldCapabilities | null): NodeFeatureSet {
  const active = node.status === 'active';
  const extensions = new Set(node.extensions ?? []);
  const storage = Boolean(capabilities?.storage_v2 && node.permissions.storage);
  return {
    storage,
    manufacturing: active && Boolean(capabilities?.storage_v2) && (storage || extensions.has('public_workspace')),
    nights: active && storage && extensions.has('nights'),
    housing: active && storage && extensions.has('housing'),
    finance: node.has_finances !== false && Boolean(node.permissions.manage || node.permissions.administer),
    cultivation: active && Boolean(capabilities?.storage_v2) && extensions.has('cultivation'),
  };
}

export function tabsForNode(node: WorldNode, features: NodeFeatureSet): NodeTab[] {
  const tabs: NodeTab[] = ['map'];
  if (features.storage || features.manufacturing) tabs.push('workshop');
  if (features.finance) tabs.push('finance');
  return tabs;
}

const anchorTabs: Record<string, NodeTab> = {
  cultivation: 'map',
  manage: 'finance',
  life: 'map', shelter: 'map', nights: 'map', housing: 'map',
  supplies: 'workshop',
  garden: 'map', premises: 'map', 'settlement-orders': 'map',
  construction: 'map', 'building-operation': 'map', 'building-repair': 'map',
  'repair-contracts': 'map', demolition: 'map', demolitions: 'map',
  'treasury-receipts': 'finance', 'finance-report': 'finance', 'budget-grant': 'finance',
};

export function tabForHash(hash: string, available: NodeTab[]): NodeTab {
  const key = hash.replace(/^#/, '');
  const target = anchorTabs[key] ?? (key as NodeTab);
  return available.includes(target) ? target : available[0] ?? 'map';
}

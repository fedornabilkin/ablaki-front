import type { WorldCapabilities, WorldNode } from './types';

export type NodeTab = 'map' | 'cultivation' | 'workshop' | 'finance' | 'statistics' | 'manage';

export interface NodeFeatureSet {
  storage: boolean;
  nights: boolean;
  housing: boolean;
  finance: boolean;
  cultivation: boolean;
}

export const tabLabels: Record<NodeTab, string> = {
  map: 'Карта', cultivation: 'Выращивание', workshop: 'Вещи и крафт', finance: 'Казна',
  statistics: 'Статистика', manage: 'Управление',
};

export function nodeFeatures(node: WorldNode, capabilities: WorldCapabilities | null): NodeFeatureSet {
  const active = node.status === 'active';
  const extensions = new Set(node.extensions ?? []);
  const storage = Boolean(capabilities?.storage_v2 && node.permissions.storage);
  return {
    storage,
    nights: active && storage && extensions.has('nights'),
    housing: active && storage && extensions.has('housing'),
    finance: true,
    cultivation: active && storage && extensions.has('cultivation'),
  };
}

export function tabsForNode(node: WorldNode, features: NodeFeatureSet): NodeTab[] {
  const tabs: NodeTab[] = ['map'];
  if (features.cultivation) tabs.push('cultivation');
  tabs.push('workshop', 'finance');
  tabs.push('statistics');
  if (node.permissions.administer) tabs.push('manage');
  return tabs;
}

const anchorTabs: Record<string, NodeTab> = {
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

import type { WorldCapabilities, WorldNode } from './types';

export type NodeTab = 'map' | 'cultivation' | 'life' | 'workshop' | 'finance' | 'development' | 'statistics' | 'manage';

export interface NodeFeatureSet {
  campsite: boolean;
  shelter: boolean;
  storage: boolean;
  nights: boolean;
  housing: boolean;
  garden: boolean;
  premises: boolean;
  orders: boolean;
  construction: boolean;
  building: boolean;
  demolitionHistory: boolean;
  finance: boolean;
  cultivation: boolean;
  warehouse: boolean;
}

export const tabLabels: Record<NodeTab, string> = {
  map: 'Карта', cultivation: 'Выращивание', life: 'Ночлег', workshop: 'Вещи и крафт', finance: 'Казна',
  development: 'Развитие', statistics: 'Статистика', manage: 'Управление',
};

export function nodeFeatures(node: WorldNode, capabilities: WorldCapabilities | null): NodeFeatureSet {
  const active = node.status === 'active';
  const campsite = node.type === 'PLOT' && node.details.plot_kind === 'campsite';
  const shelter = Boolean(node.details.shelter_instance_id);
  const storage = Boolean(capabilities?.storage_v2 && node.permissions.storage && !shelter);
  const publicSettlement = node.type === 'SETTLEMENT' && node.visibility === 'public';
  const ownedCampsite = campsite && node.permissions.storage;
  return {
    campsite, shelter, storage,
    nights: active && ownedCampsite,
    housing: node.type === 'ROOM' && node.permissions.storage,
    garden: active && (publicSettlement || (node.type === 'PLOT' && ['campsite', 'garden'].includes(String(node.details.plot_kind)) && node.permissions.storage)),
    premises: active && (publicSettlement || ownedCampsite),
    orders: active && publicSettlement,
    construction: storage && ['PLOT', 'BUILDING'].includes(node.type),
    building: storage && node.type === 'BUILDING',
    demolitionHistory: storage && node.type === 'PLOT',
    finance: !shelter && (node.has_finances ?? (!['ROOM', 'BED'].includes(node.type) && node.details.building_kind !== 'warehouse')),
    cultivation: active && node.type === 'BED' && node.permissions.storage && Boolean(node.details.unlocked),
    warehouse: active && storage && node.type === 'BUILDING' && ['forge', 'workshop', 'workroom', 'warehouse'].includes(String(node.details.building_kind)),
  };
}

export function tabsForNode(node: WorldNode, features: NodeFeatureSet): NodeTab[] {
  const tabs: NodeTab[] = ['map'];
  if (features.cultivation) tabs.push('cultivation');
  if (features.nights || features.housing) tabs.push('life');
  if (features.storage || features.housing) tabs.push('workshop');
  if (features.finance) tabs.push('finance');
  if (features.garden || features.premises || features.orders || features.construction || features.building || features.demolitionHistory) tabs.push('development');
  tabs.push('statistics');
  if (node.permissions.administer) tabs.push('manage');
  return tabs;
}

const anchorTabs: Record<string, NodeTab> = {
  shelter: 'life', nights: 'life', housing: 'life',
  supplies: 'workshop',
  garden: 'development', premises: 'development', 'settlement-orders': 'development',
  construction: 'development', 'building-operation': 'development', 'building-repair': 'development',
  'repair-contracts': 'development', demolition: 'development', demolitions: 'development',
  'treasury-receipts': 'finance', 'finance-report': 'finance', 'budget-grant': 'finance',
};

export function tabForHash(hash: string, available: NodeTab[]): NodeTab {
  const key = hash.replace(/^#/, '');
  const target = anchorTabs[key] ?? (key as NodeTab);
  return available.includes(target) ? target : 'map';
}

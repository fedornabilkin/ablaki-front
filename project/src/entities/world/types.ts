export const nodeTypes = ['WORLD', 'REGION', 'SETTLEMENT', 'BUILDING', 'ROOM', 'PLOT', 'BED', 'CHEST', 'PLACE'] as const;
export type NodeType = typeof nodeTypes[number];
export interface WorldReason { code: string; message?: string }
export interface WorldAction { code: string; allowed: boolean; reasons: WorldReason[] }
export interface MapBounds { x: number; y: number; width: number; height: number }
export interface WorldOwnership { id?: number | null; owned_by_me: boolean; has_finances?: boolean }
export interface WorldNode {
  owner?: WorldOwnership;
  extensions?: string[];
  map?: MapBounds; has_finances?: boolean;
  id: number; type: NodeType; parent_id: number | null; root_id: number; code: string; name: string; label: string;
  status: string; visibility: 'public' | 'private'; revision: number; portable: boolean;
  coordinates: { x: number; y: number }; child_count: number;
  descendant_count: number; population_total: number; owned_by_me: boolean;
  footprint: { x: number; y: number }[] | null;
  details: Record<string, string | number | boolean | null>; permissions: { manage: boolean; administer: boolean; storage: boolean }; actions: WorldAction[];
}
export interface WorldPage { items: WorldNode[]; total: number; pageSize: number; currentPage: number; pageCount: number }
export interface MapExploration { allowed: boolean; level: number; max_level_per_node: number; elixir_quantity: number; reason: string }
export interface PlacedWorldItem { x: number; y: number; item_id?: number; lodging?: boolean; name?: string; icon?: string; description?: string; quantity?: number; characteristics?: { label: string; value: string }[]; inventory_id?: number | null; storage_id?: number | null }
export interface WorldMapData { equipment_cells?: PlacedWorldItem[]; exploration?: MapExploration; pricing?: import('./mapSelection').MapPricing; bounds?: MapBounds; node_id: number; items: WorldNode[]; cells: { x: number; y: number; state: 'discovered' | 'open' }[]; can_expand: boolean }
export interface WorldCapabilities { schema_ready: boolean; contract_version: number; world_read: boolean; world_write: boolean; storage_v2: boolean; economy_tick: boolean }
export interface WorldRoot { home_node_id?: number | null; contract_version: number; server_time: number; capabilities: WorldCapabilities; world: WorldNode | null; regions: WorldPage }
export interface WorldNavigation { node: WorldNode; breadcrumbs: WorldNode[]; parent_id: number | null; siblings: WorldPage }
export interface WorldTreeNode extends WorldNode {
  map?: MapBounds & Partial<Omit<WorldMapData, 'items' | 'node_id' | 'bounds'>>;
  children: WorldTreeNode[]; children_loaded: boolean;
  geo: Pick<WorldNode, 'coordinates' | 'footprint'>;
  state: Pick<WorldNode, 'status' | 'visibility' | 'revision' | 'portable' | 'details' | 'permissions' | 'actions'>;
  construction: { condition: number | null; max_condition: number | null; repair_active: boolean };
  owner: WorldOwnership;
}
export interface WorldScreen { contract_version: number; server_time: number; capabilities: WorldCapabilities; navigation: WorldNavigation | null; map: WorldMapData | null; world?: WorldTreeNode | null }
export interface WorldQuote { quote_id: string; expires_at: number; expected_revisions: Record<string, number>; terms: Record<string, unknown>; server_time: number }
export interface CraftResult { output: { name: string; quantity: number }; materials: { name: string; quantity: number }[]; price: string; experience: number }
export interface WorldCommandResult { operation_id: string; request_key: string; contract_version: number; server_time: number; changed_node_ids: number[]; changed_storage_ids?: number[]; node?: WorldNode; amount?: string; wallet_after?: string; currency?: 'Cr'; building_id?: number; room_id?: number; project_id?: number; finish_at?: number; return_node_id?: number; craft_result?: CraftResult }
export interface WorldOnboarding { world_id: number; joined: boolean; starter_site_id: number | null; joined_at: number | null; grace_until: number | null; server_time: number; join_available: boolean }
export const nodeLabels: Record<NodeType, string> = { WORLD: 'Мир', REGION: 'Регион', SETTLEMENT: 'Поселение', BUILDING: 'Постройка', ROOM: 'Помещение', PLOT: 'Участок', BED: 'Грядка', CHEST: 'Сундук', PLACE: 'Место' };
export const nodeIcons: Record<NodeType, string> = { WORLD: 'globe', REGION: 'map', SETTLEMENT: 'city', BUILDING: 'home', ROOM: 'door-open', PLOT: 'seedling', BED: 'leaf', CHEST: 'box', PLACE: 'cube' };

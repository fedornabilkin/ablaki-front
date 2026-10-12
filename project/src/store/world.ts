import { defineStore } from 'pinia';
import { reactive, ref, shallowRef } from 'vue';
import { isAxiosError } from 'axios';
import { loadWorldScreen, worldError } from '@/services/api/world';
import type { WorldCapabilities, WorldNode, WorldPage, WorldMapData, WorldTreeNode } from '@/entities/world/types';
import { mergeWorldTree, screenTree } from '@/entities/world/tree';

const emptyPage = (): WorldPage => ({ items: [], total: 0, pageSize: 20, currentPage: 1, pageCount: 0 });
export const useWorldStore = defineStore('server-world', () => {
  const capabilities = shallowRef<WorldCapabilities | null>(null), node = ref<WorldTreeNode | null>(null);
  const world = ref<WorldTreeNode | null>(null), nodes = reactive(new Map<number, WorldTreeNode>());
  const breadcrumbs = shallowRef<WorldNode[]>([]);
  const map = ref<WorldMapData | null>(null);
  const siblings = shallowRef<WorldPage>(emptyPage());
  const loading = ref(false), error = ref(''), dataRevision = ref(0);
  let session: number | null = null, request = 0;
  function setSession(next: number) {
    if (next === session) return;
    session = next; request++; nodes.clear(); world.value = null; capabilities.value = null; node.value = null; breadcrumbs.value = []; map.value = null; siblings.value = emptyPage(); error.value = ''; loading.value = false; dataRevision.value++;
  }
  async function load(id: number | null, preserve = false) {
    const current = ++request; loading.value = true; error.value = '';
    // Keep the current screen mounted while Vue loads the next level.
    // Session changes still clear private data synchronously in setSession.
    try {
      const screen = await loadWorldScreen(id);
      if (current !== request) return;
      capabilities.value = screen.capabilities;
      const incoming = screenTree(screen);
      if (!incoming || !screen.navigation) { nodes.clear(); world.value = null; node.value = null; breadcrumbs.value = []; map.value = null; siblings.value = emptyPage(); return; }
      if (world.value && world.value.id !== incoming.id) nodes.clear();
      world.value = mergeWorldTree(nodes, incoming);
      node.value = nodes.get(screen.navigation.node.id)!;
      breadcrumbs.value = screen.navigation.breadcrumbs.map(item => nodes.get(item.id)!);
      const nextMap = screen.map ? { ...screen.map, items: node.value.children,
        cells: node.value.map?.cells ?? screen.map.cells, equipment_cells: node.value.map?.equipment_cells ?? screen.map.equipment_cells,
        exploration: node.value.map?.exploration ?? screen.map.exploration, pricing: node.value.map?.pricing ?? screen.map.pricing, can_expand: node.value.map?.can_expand ?? screen.map.can_expand } : null;
      if (nextMap && map.value?.node_id === nextMap.node_id) Object.assign(map.value, nextMap); else map.value = nextMap;
      siblings.value = { ...screen.navigation.siblings, items: screen.navigation.siblings.items.map(item => nodes.get(item.id)!) };
    } catch (cause) { if (current === request) { error.value = worldError(cause); if (node.value?.id !== id || isAxiosError(cause) && [401, 403, 404].includes(cause.response?.status ?? 0)) { nodes.clear(); world.value = null; node.value = null; breadcrumbs.value = []; map.value = null; siblings.value = emptyPage(); } } }
    finally { if (current === request) loading.value = false; }
  }
  function invalidate(ids: number[], preserve = false) {
    request++;
    if (!preserve && (!node.value || ids.includes(node.value.id) || map.value?.items.some(child => ids.includes(child.id)))) { node.value = null; map.value = null; }
    dataRevision.value++;
  }
  function cancel() { request++; loading.value = false; }
  return { world, capabilities, node, breadcrumbs, map, siblings, loading, error, dataRevision, setSession, load, invalidate, cancel };
});

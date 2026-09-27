import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { loadWorld, loadWorldChildren, loadWorldNavigation, worldError } from '@/services/api/world';
import type { WorldCapabilities, WorldNode, WorldPage } from '@/entities/world/types';

const emptyPage = (): WorldPage => ({ items: [], total: 0, pageSize: 20, currentPage: 1, pageCount: 0 });
export const useWorldStore = defineStore('server-world', () => {
  const capabilities = shallowRef<WorldCapabilities | null>(null), node = shallowRef<WorldNode | null>(null);
  const breadcrumbs = shallowRef<WorldNode[]>([]), children = shallowRef<WorldPage>(emptyPage());
  const siblings = shallowRef<WorldPage>(emptyPage());
  const loading = ref(false), error = ref(''), dataRevision = ref(0);
  let session: number | null = null, request = 0;
  function setSession(next: number) {
    if (next === session) return;
    session = next; request++; capabilities.value = null; node.value = null; breadcrumbs.value = []; children.value = emptyPage(); siblings.value = emptyPage(); error.value = ''; loading.value = false; dataRevision.value++;
  }
  async function load(id: number | null, params: Record<string, unknown>) {
    const current = ++request; loading.value = true; error.value = ''; node.value = null; breadcrumbs.value = []; children.value = emptyPage(); siblings.value = emptyPage();
    try {
      const root = await loadWorld(params);
      if (current !== request) return;
      capabilities.value = root.capabilities;
      if (!root.capabilities.world_read || !root.world) return;
      const target = id ?? root.world.id;
      const [navigation, page] = await Promise.all([loadWorldNavigation(target), loadWorldChildren(target, params)]);
      if (current !== request) return;
      node.value = navigation.node; breadcrumbs.value = navigation.breadcrumbs; children.value = page; siblings.value = navigation.siblings;
    } catch (cause) { if (current === request) error.value = worldError(cause); }
    finally { if (current === request) loading.value = false; }
  }
  function invalidate(ids: number[]) {
    request++;
    if (!node.value || ids.includes(node.value.id) || children.value.items.some(child => ids.includes(child.id))) { node.value = null; children.value = emptyPage(); }
    dataRevision.value++;
  }
  function cancel() { request++; loading.value = false; }
  return { capabilities, node, breadcrumbs, children, siblings, loading, error, dataRevision, setSession, load, invalidate, cancel };
});

<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { breadcrumbs } from '@/services/breadcrumbs';
import { useWorldStore } from '@/store/world';
import { loadWorldScreen } from '@/services/api/world';
import type { WorldNode } from '@/entities/world/types';
import { workspaceSections, workspaceNode } from '@/entities/world/workspaceNavigation';
const route = useRoute();
const world = useWorldStore();
const auth = useStore(), navigation = ref<WorldNode[]>([]);
const nodePage = computed(() => route.path === '/world' || /^\/world\/nodes\/[^/]+$/.test(route.path));
let generation = 0;
watch(() => [route.path, route.query.node, auth.state.auth.revision, auth.getters['auth/isAuthenticated']], async () => {
  const current = ++generation; navigation.value = [];
  if (!route.path.startsWith('/world/') || nodePage.value || !auth.getters['auth/isAuthenticated']) return;
  const workspace = route.path.startsWith('/world/workspace');
  if (route.meta.workspaceSection) return;
  const id = workspace ? workspaceNode(route.params.id ?? route.query.node) ?? null : null;
  if (workspace && id === null) return;
  if (id !== null && (!Number.isSafeInteger(id) || id < 1)) return;
  try { const screen = await loadWorldScreen(id); if (current === generation) navigation.value = screen.navigation?.breadcrumbs ?? []; }
  catch { /* The page itself displays loading and access errors. */ }
}, { immediate: true });
onScopeDispose(() => { generation++; });
const items = computed(() => {
  if (route.path !== '/world' && !route.path.startsWith('/world/')) return breadcrumbs(route.path, route.params);
  const section = workspaceSections.find(s => s.id === route.meta.workspaceSection);
  if (section) return [{ title: 'Мир', to: '/world' }, { title: 'Мастерская', to: '/world/workspace' }, { title: section.title }];
  const nodes = nodePage.value && (route.params.id === undefined || Number(route.params.id) === world.node?.id) ? world.breadcrumbs : navigation.value;
  const path = nodes.map((node, index) => ({ title: node.label, to: nodePage.value && index === nodes.length - 1 ? undefined : `/world/nodes/${node.id}` }));
  if (!nodePage.value) path.push({ title: ({ workspace: 'Изготовление', storage: 'Хранилище', recovery: 'Восстановление вещей', equipment: 'Оборудование' } as Record<string, string>)[route.path.split('/')[2]] ?? 'Объект', to: undefined });
  return path;
});
</script>
<template lang="pug">
nav.breadcrumbs.container(aria-label="Хлебные крошки")
  ol
    li(v-for="(item, index) in items" :key="index")
      span.separator(v-if="index" aria-hidden="true") / 
      router-link(v-if="item.to" :to="item.to") {{ item.title }}
      span(v-else aria-current="page") {{ item.title }}
</template>
<style scoped>
.breadcrumbs { padding-top: .75rem; }
ol { list-style: none; display: flex; flex-wrap: wrap; gap: .4rem; padding: 0; margin: 0; font-size: .85rem; }
li { display: flex; align-items: center; gap: .4rem; min-width: 0; overflow-wrap: anywhere; }
.separator, [aria-current] { color: var(--text-muted); }
</style>

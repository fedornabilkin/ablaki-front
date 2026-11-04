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
const worldSection = computed(() => route.path === '/world' || route.path.startsWith('/world/'));
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
nav.breadcrumbs.container(v-if="items.length" :class="{ 'breadcrumbs--world': worldSection }" aria-label="Хлебные крошки")
  ol
    li(v-for="(item, index) in items" :key="index")
      font-awesome-icon.separator(v-if="index" icon="chevron-right" aria-hidden="true")
      router-link(v-if="item.to" :to="item.to" :title="item.title") {{ item.title }}
      span(v-else aria-current="page") {{ item.title }}
</template>
<style scoped>
.breadcrumbs { padding-top: .65rem; }
.breadcrumbs--world { max-width: 1320px; }
ol { list-style: none; display: flex; flex-wrap: wrap; align-items: center; gap: .15rem .45rem; padding: 0; margin: 0; font-size: .75rem; line-height: 1.5; }
li { display: inline-flex; align-items: center; gap: .45rem; min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
li a { display: inline-block; max-width: 24ch; padding-block: .4rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.separator { flex: none; font-size: .5rem; opacity: .7; }
.separator, [aria-current] { color: var(--text-muted); }
@media(min-width: 64rem) { .breadcrumbs { padding-top: .85rem; } ol { font-size: .8125rem; } }
</style>

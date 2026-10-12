<script setup lang="ts">
import { useRoute } from 'vue-router';
import { workspaceSections, workspaceQuery } from '@/entities/world/workspaceNavigation';
defineProps<{ nodeId?: number; manufacturing?: boolean }>();
const route = useRoute();
</script>
<template lang="pug">
nav.workspace-sections(aria-label="Разделы мастерской")
  router-link(v-for="section in workspaceSections" :key="section.id" :to="{ path: `/world/workspace/${section.id}`, query: workspaceQuery(nodeId) }" :class="{ active: route.meta.workspaceSection === section.id }" :aria-current="route.meta.workspaceSection === section.id ? 'page' : undefined") {{ section.title }}
  router-link(v-if="manufacturing && nodeId" :to="`/world/workspace/${nodeId}`" class="active" aria-current="page") Изготовление
</template>
<style scoped>
.workspace-sections { display: flex; flex-wrap: wrap; gap: .4rem; }
.workspace-sections a { padding: .55rem .75rem; border: 1px solid var(--border); border-radius: .5rem; color: var(--text-muted); }
.workspace-sections a:hover, .workspace-sections a.active { border-color: var(--primary); background: var(--primary-soft); color: var(--primary); }
</style>

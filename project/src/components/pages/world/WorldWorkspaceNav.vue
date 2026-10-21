<script setup lang="ts">
import { useRoute } from 'vue-router';
import { workspaceSections, workspaceQuery } from '@/entities/world/workspaceNavigation';
withDefaults(defineProps<{ nodeId?: number; manufacturing?: boolean; showManufacturing?: boolean }>(), { showManufacturing: true });
const route = useRoute();
</script>
<template lang="pug">
nav.workspace-sections(aria-label="Разделы мастерской")
  router-link(v-for="section in workspaceSections" :key="section.id" :to="{ path: `/world/workspace/${section.id}`, query: workspaceQuery(nodeId) }" :class="{ active: route.meta.workspaceSection === section.id }" :aria-current="route.meta.workspaceSection === section.id ? 'page' : undefined") {{ section.title }}
  router-link.manufacturing-link(v-if="nodeId && showManufacturing" :to="`/world/workspace/${nodeId}`" :class="{ active: manufacturing }" :aria-current="manufacturing ? 'page' : undefined") Изготовление в этом объекте
</template>
<style scoped>
.workspace-sections { display: flex; flex-wrap: wrap; gap: .4rem; }
.workspace-sections a { padding: .55rem .75rem; border: 1px solid var(--border); border-radius: .5rem; color: var(--text-muted); }
.workspace-sections a:hover, .workspace-sections a.active { border-color: var(--primary); background: var(--primary-soft); color: var(--primary); }
</style>

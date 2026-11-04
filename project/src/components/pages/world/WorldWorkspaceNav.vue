<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import WorldActionBar from './WorldActionBar.vue';
import { workspaceSections, workspaceQuery } from '@/entities/world/workspaceNavigation';
const props = withDefaults(defineProps<{ nodeId?: number; manufacturing?: boolean; showManufacturing?: boolean }>(), { showManufacturing: true });
const route = useRoute();
const links = computed(() => [
  ...workspaceSections.map(section => ({ id: section.id, label: section.title, hint: section.title, icon: section.icon, to: { path: `/world/workspace/${section.id}`, query: workspaceQuery(props.nodeId) }, active: route.meta.workspaceSection === section.id })),
  ...(props.nodeId && props.showManufacturing ? [{ id: 'craft', label: 'Изготовление', hint: 'Изготовление в этом объекте', icon: 'hammer', to: route.path.startsWith('/world/nodes/') ? `/world/nodes/${props.nodeId}#craft` : `/world/workspace/${props.nodeId}`, active: Boolean(props.manufacturing) }] : []),
]);
</script>
<template lang="pug">
world-action-bar.workspace-sections(label="Разделы мастерской" :items="links")
</template>

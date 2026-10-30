<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import SectionNav from '@/components/SectionNav.vue';
import { workspaceSections, workspaceQuery } from '@/entities/world/workspaceNavigation';
const props = withDefaults(defineProps<{ nodeId?: number; manufacturing?: boolean; showManufacturing?: boolean }>(), { showManufacturing: true });
const route = useRoute();
const links = computed(() => [
  ...workspaceSections.map(section => ({ label: section.title, icon: section.icon, to: { path: `/world/workspace/${section.id}`, query: workspaceQuery(props.nodeId) }, active: route.meta.workspaceSection === section.id })),
  ...(props.nodeId && props.showManufacturing ? [{ label: 'Изготовление в этом объекте', icon: 'hammer', to: `/world/workspace/${props.nodeId}`, active: Boolean(props.manufacturing) }] : []),
]);
</script>
<template lang="pug">
section-nav.workspace-sections(label="Разделы мастерской" :items="links")
</template>

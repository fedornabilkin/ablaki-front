<script setup lang="ts">
import { computed } from 'vue';
import type { WorldNode } from '@/entities/world/types';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import WorldHeroGather from './WorldHeroGather.vue';
import WorldMiningPanel from './WorldMiningPanel.vue';
import WorldHarvestPanel from './WorldHarvestPanel.vue';
import WorldCultivationPanel from './WorldCultivationPanel.vue';
import WorldEquipmentExpansionPanel from './WorldEquipmentExpansionPanel.vue';
import WorldKitchenPanel from './WorldKitchenPanel.vue';
const props = defineProps<{ node: WorldNode; slot: 'header' | 'map' | 'content' | 'cultivation' | 'equipment'; owner: number; session: number; revision: number; writable: boolean; command: WorldCommandRunner }>();
const emit = defineEmits<{ changed: [] }>();
const panels = computed(() => {
  if (props.node.status !== 'active') return [];
  const common = { nodeId: props.node.id, session: props.session, owner: props.owner, writable: props.writable, command: props.command, revision: props.revision };
  const registry = [
    { feature: 'gather', slot: 'header', component: WorldHeroGather, props: common },
    { feature: 'mining', slot: 'map', component: WorldMiningPanel, props: common },
    { feature: 'harvest', slot: 'content', component: WorldHarvestPanel, props: common },
    { feature: 'kitchen', slot: 'content', component: WorldKitchenPanel, props: common },
    { feature: 'cultivation', slot: 'cultivation', component: WorldCultivationPanel, props: { ...common, bedId: props.node.id } },
    { feature: 'equipment_expansion', slot: 'equipment', component: WorldEquipmentExpansionPanel, props: common },
  ];
  return registry.filter(panel => panel.slot === props.slot && props.node.extensions?.includes(panel.feature) && (props.node.permissions.storage || panel.feature === 'kitchen' || panel.feature === 'cultivation' || panel.feature === 'harvest' || (panel.feature === 'mining' && (props.node.details.building_kind === 'mine' || props.node.extensions.includes('public_work')))));
});
</script>
<template lang="pug">
.world-node-extensions
  component(v-for="(panel, index) in panels" :key="`${node.id}:${panel.feature}:${index}`" :is="panel.component" v-bind="panel.props" @changed="emit('changed')")
</template>
<style scoped>
.world-node-extensions { display: contents; }
</style>

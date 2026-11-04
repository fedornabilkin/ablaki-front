<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import WorldHero from './WorldHero.vue';
import WorldPageActions from './WorldPageActions.vue';
withDefaults(defineProps<{ title: string; description?: string; icon?: string; parentTo?: string; parentLabel?: string; compact?: boolean }>(), { icon: 'hammer', parentLabel: 'Вернуться к объекту' });
const route = useRoute();
const contextNode = computed(() => {
  const id = Number(/^\/world\/workspace\/\d+$/.test(route.path) ? route.params.id : route.query.node ?? route.query.node_id);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
});
</script>
<template lang="pug">
world-hero.world-workspace-hero(:title="title" :icon="icon" :description="compact ? undefined : description" :parent-to="parentTo" :parent-label="parentLabel")
  slot
  template(#actions)
    world-page-actions(v-if="route.path.startsWith('/world')" :node-id="contextNode")
</template>

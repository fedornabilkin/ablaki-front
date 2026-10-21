<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { useWorldStore } from '@/store/world';
import type { WorldNode } from '@/entities/world/types';
import WorldHeroFinances from './WorldHeroFinances.vue';
import WorldMvpProgress from './WorldMvpProgress.vue';
defineProps<{ node?: WorldNode; nodeId?: number }>();
const auth = useStore(), world = useWorldStore(), route = useRoute();
const owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0));
const session = computed(() => Number(auth.state.auth.revision));
function changed() {
  if (world.node) {
    const id = world.node.id; world.invalidate([id], true);
    if (/^\/world(?:\/nodes\/\d+)?$/.test(route.path)) void world.load(id, true);
  }
  void auth.dispatch('auth/fetchData');
}
</script>
<template lang="pug">
.world-page-actions(v-if="owner")
  world-hero-finances(:node="node" :node-id="nodeId" :owner="owner" :session="session" :revision="world.dataRevision")
  world-mvp-progress(:owner="owner" :session="session" :revision="world.dataRevision" :writable="world.capabilities?.world_write ?? true" @changed="changed")
</template>
<style scoped>
.world-page-actions { display: flex; align-items: start; justify-content: flex-end; flex-wrap: wrap; gap: 1rem; margin-left: auto; }
</style>

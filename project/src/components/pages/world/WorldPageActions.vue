<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { useWorldStore } from '@/store/world';
import type { WorldNode } from '@/entities/world/types';
import WorldDisclosure from './WorldDisclosure.vue';
import WorldHeroFinances from './WorldHeroFinances.vue';
import WorldMvpProgress from './WorldMvpProgress.vue';
import WorldChecklist from './WorldChecklist.vue';
import WorldCharacterButton from './WorldCharacterButton.vue';
import type { MvpState } from '@/services/api/worldMvp';
defineProps<{ node?: WorldNode; nodeId?: number }>();
const auth = useStore(), world = useWorldStore(), route = useRoute();
const owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0));
const session = computed(() => Number(auth.state.auth.revision));
const refresh = ref(0);
const snapshot = ref<{ state: MvpState | null; loading: boolean; error: string }>({ state: null, loading: true, error: '' });
watch([owner, session], () => { snapshot.value = { state: null, loading: true, error: '' }; }, { flush: 'sync' });
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
  world-disclosure.character-tools(label="Персонаж и задачи" icon="user")
    .character-tools-actions
      world-mvp-progress(:owner="owner" :session="session" :revision="world.dataRevision + refresh" :writable="world.capabilities?.world_write ?? true" @changed="changed" @snapshot="snapshot = $event")
      world-checklist(:owner="owner" :session="session" :snapshot="snapshot" @refresh="refresh++")
      world-character-button(:key="session" :session="session" :health="snapshot.state?.health" :health-error="snapshot.error")
</template>
<style scoped>
 .world-page-actions { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem 1.25rem; }
.world-page-actions > .hero-finances { flex-basis: 100%; }
.character-tools { width: 100%; }
.character-tools-actions { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; }
@media(min-width: 1000px) { .world-page-actions { min-width: 16rem; }.character-tools { max-width: 26rem; } }
</style>

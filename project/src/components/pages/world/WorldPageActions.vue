<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { useWorldStore } from '@/store/world';
import type { WorldNode } from '@/entities/world/types';
import WorldHeroFinances from './WorldHeroFinances.vue';
import WorldMvpProgress from './WorldMvpProgress.vue';
import WorldChecklist from './WorldChecklist.vue';
import WorldCharacterButton from './WorldCharacterButton.vue';
import type { MvpState } from '@/services/api/worldMvp';
defineProps<{ node?: WorldNode; nodeId?: number }>();
const emit = defineEmits<{ snapshot: [value: { state: MvpState | null; loading: boolean; error: string }] }>();
const auth = useStore(), world = useWorldStore(), route = useRoute();
const owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0));
const session = computed(() => Number(auth.state.auth.revision));
const refresh = ref(0);
const snapshot = ref<{ state: MvpState | null; loading: boolean; error: string }>({ state: null, loading: true, error: '' });
watch(snapshot, value => emit('snapshot', value), { immediate: true, flush: 'sync' });
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
  .character-tools-actions(aria-label="Задания и персонаж")
    world-mvp-progress(:owner="owner" :session="session" :revision="world.dataRevision + refresh" :writable="world.capabilities?.world_write ?? true" @changed="changed" @snapshot="snapshot = $event")
    world-checklist(:owner="owner" :session="session" :snapshot="snapshot" @refresh="refresh++")
    world-character-button(:key="session" :session="session" :health="snapshot.state?.health" :health-error="snapshot.error")
</template>
<style scoped>
.world-page-actions { display: flex; align-items: center; flex-wrap: wrap; flex: 1 1 auto; gap: .5rem .75rem; min-width: 0; }
.character-tools-actions { display: flex; align-items: center; gap: .6rem; flex-shrink: 0; margin-left: auto; }
@media(min-width: 64rem) { .world-page-actions { flex: 0 1 auto; } }
</style>

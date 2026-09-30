<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { NButton } from 'naive-ui';
import RequestState from '@/components/RequestState.vue';
import { usePageRequest } from '@/hooks/usePageRequest';
import { gameSummary, type GameKind, type GameSummary } from '@/services/api/gameOverview';
import GameQuickStats from './GameQuickStats.vue';
import RecentGames from './RecentGames.vue';

const props = withDefaults(defineProps<{ kind: GameKind; version?: unknown; showRecent?: boolean }>(), { showRecent: true });
const store = useStore();
const session = computed(() => store.state.auth.revision);
const kind = computed(() => props.kind);
const version = ref(0);
const summary = usePageRequest<GameSummary | null>(() => gameSummary(kind.value), null, [kind, session, version]);
watch(() => props.version, () => { version.value++; });
</script>
<template lang="pug">
.container.page.stack
  .quick-stats-sticky(:aria-busy="summary.loading.value")
    game-quick-stats(v-if="summary.data.value" :summary="summary.data.value" :unit="kind === 'saper' ? 'Кг' : 'Cr'" :kind="kind")
    request-state(v-else :loading="summary.loading.value" :error="summary.error.value" @retry="summary.refresh")
    n-button(v-if="summary.data.value && summary.error.value" size="tiny" @click="summary.refresh") Повторить обновление статистики
  .game-page-columns(:class="{ 'game-page-columns--single': !showRecent }")
    main.game-page-main
      slot
    aside.game-page-recent(v-if="showRecent" aria-label="Последние игры")
      recent-games(:kind="kind" :version="version")
</template>
<style scoped>
.quick-stats-sticky { position: sticky; top: var(--site-header-height, 4rem); z-index: 20; background: var(--bg-base); }
.game-page-columns { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; align-items: start; }
.game-page-main, .game-page-recent { min-width: 0; }
@media (min-width: 992px) { .game-page-columns:not(.game-page-columns--single) { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>

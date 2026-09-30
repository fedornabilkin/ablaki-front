<script setup lang="ts">
import GameHistoryPanel from './GameHistoryPanel.vue';
import type { GameKind } from '@/services/api/gameOverview';
import type { GameOverviewSnapshot } from '@/services/api/gameOverview';
defineProps<{ kind: GameKind; version: number; snapshot?: GameOverviewSnapshot | null }>();
</script>
<template lang="pug">
game-history-panel(:key="kind" :kind="kind" :reload-list-trigger="version" :snapshot="snapshot" scope="recent")
</template>

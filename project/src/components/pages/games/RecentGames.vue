<script setup lang="ts">
import GameHistoryPanel from './GameHistoryPanel.vue';
import type { GameKind } from '@/services/api/gameOverview';
defineProps<{ kind: GameKind; version: number }>();
</script>
<template lang="pug">
game-history-panel(:key="kind" :kind="kind" :reload-list-trigger="version" scope="recent")
</template>

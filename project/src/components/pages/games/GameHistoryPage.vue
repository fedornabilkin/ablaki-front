<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import GameHistoryPanel from './GameHistoryPanel.vue';
import GameToolbar from './GameToolbar.vue';
import type { HistoryGameKind } from '@/services/api/gameHistory';
defineProps<{ kind: HistoryGameKind }>();
const names = { orel: 'Орлянка', saper: 'Сапёр', duel: 'Дуэль', five: '5 яблок' };
</script>
<template lang="pug">
page-header(:page-title="names[kind] + ' — история'")
  game-toolbar(:kind="kind" :inline-create="false")
.container.page
  game-history-panel(:key="kind" :kind="kind")
</template>

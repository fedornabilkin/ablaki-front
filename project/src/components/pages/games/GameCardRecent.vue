<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NSkeleton } from 'naive-ui';
import { usePageRequest } from '@/hooks/usePageRequest';
import { type RecordData } from '@/services/api/portal';
import { homeRecentGames } from '@/services/api/homeGames';
import { historyPlayer, type HistoryGameKind } from '@/services/api/gameHistory';
import { formatAccountNumber } from '@/services/api/header';
const props = defineProps<{ kind: HistoryGameKind }>();
const recent = usePageRequest(() => homeRecentGames(props.kind), [] as RecordData[], [() => props.kind]);
const rows = computed(() => recent.data.value.map(game => ({ game, winner: game.winner, players: (['creator', 'player'] as const).map(side => ({ side, user: historyPlayer(game, side) })) })));
</script>
<template lang="pug">
.card-recent(aria-label="Три последние завершённые игры")
  small.muted Последние игры
  div(v-if="recent.loading.value" role="status" aria-label="Загрузка последних игр")
    n-skeleton(text :repeat="3")
  .recent-error(v-else-if="recent.error.value" role="alert")
    small {{ recent.error.value }}
    n-button(size="tiny" text @click="recent.refresh") Повторить
  small.muted(v-else-if="!rows.length") Завершённых игр пока нет
  .recent-game(v-for="row in rows" :key="row.game.id")
    .recent-player(v-for="player in row.players" :key="player.side")
      router-link(v-if="player.user" :to="'/wall/' + encodeURIComponent(String(player.user.username))") {{ player.user.username }}
      span.muted(v-else) —
      font-awesome-icon.winner(v-if="row.winner === player.side" icon="trophy" title="Победитель" aria-label="Победитель")
    strong {{ formatAccountNumber(row.game.kon) }} {{ kind === 'saper' ? 'Кг' : 'Cr' }}
    small.muted(v-if="row.winner === 'draw'") Ничья
</template>
<style scoped>
.card-recent { display: grid; align-content: start; gap: .65rem; min-width: 0; }
.recent-game { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; align-items: center; gap: .5rem; }
.recent-player { display: flex; align-items: center; gap: .25rem; min-width: 0; }
.recent-player a { overflow-wrap: anywhere; position: relative; z-index: 1; }
.winner { color: var(--primary); flex-shrink: 0; font-size: .75rem; }
.recent-game strong { white-space: nowrap; font-size: .85rem; }
.recent-error { position: relative; z-index: 1; }
</style>

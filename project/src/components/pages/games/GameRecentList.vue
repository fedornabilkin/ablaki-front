<script setup lang="ts">
import { computed } from 'vue';
import UserAvatar from '@/components/user/UserAvatar.vue';
import { formatAccountNumber } from '@/services/api/header';
import { historyWinner, historyPlayer, historyCompletedAt, historyTime, type HistoryGameKind } from '@/services/api/gameHistory';
import type { RecordData } from '@/services/api/portal';

const props = defineProps<{ games: RecordData[]; kind: HistoryGameKind }>();
const rows = computed(() => props.games.map(game => ({
  game,
  winner: historyWinner(game, props.kind),
  creator: historyPlayer(game, 'creator'),
  player: historyPlayer(game, 'player'),
  completedAt: historyCompletedAt(game, props.kind),
})));
</script>
<template lang="pug">
.recent-games
  .recent-game(v-for="row in rows" :key="row.game.id")
    .recent-meta
      strong.recent-stake {{ formatAccountNumber(row.game.kon) }} {{ kind === 'saper' ? 'Кг' : 'Cr' }}
      small.muted {{ historyTime(row.completedAt) }}
    .recent-players
      .recent-player.recent-player--creator
        .avatar-wrap(v-if="row.creator")
          user-avatar(:user="row.creator")
          font-awesome-icon.winner(v-if="row.winner === 'creator'" icon="trophy" title="Победитель" aria-label="Победитель")
        span.muted(v-else) Участник недоступен
      strong.vs VS
      .recent-player.recent-player--opponent
        .avatar-wrap(v-if="row.player")
          user-avatar(:user="row.player")
          font-awesome-icon.winner(v-if="row.winner === 'player'" icon="trophy" title="Победитель" aria-label="Победитель")
        span.muted(v-else) Участник недоступен
</template>
<style scoped>
.recent-games { display: grid; gap: .75rem; }
.recent-game { display: grid; gap: .35rem; padding: .75rem; border: 1px solid var(--border); border-radius: .5rem; }
.recent-meta { display: flex; align-items: baseline; justify-content: space-between; gap: .5rem; }
.recent-meta small { font-size: .72rem; text-align: right; }
.recent-players { display: grid; grid-template-columns: minmax(0, 1fr) 2.75rem minmax(0, 1fr); gap: .75rem; align-items: center; }
.recent-player { min-width: 0; display: flex; }
.recent-player--creator { justify-content: flex-end; }
.recent-player--opponent { justify-content: flex-start; }
.avatar-wrap { position: relative; width: fit-content; max-width: 100%; }
.winner { position: absolute; top: -.55rem; left: -.4rem; z-index: 1; color: var(--primary); filter: drop-shadow(0 1px 1px var(--bg-surface)); }
.vs { color: #fff; font-size: 2.75rem; line-height: 1; text-align: center; }
@media (max-width: 600px) { .recent-players { gap: .25rem; } .recent-player :deep(.user-rating) { display: none; } }
</style>

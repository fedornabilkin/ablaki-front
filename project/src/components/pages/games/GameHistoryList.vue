<script setup lang="ts">
import { computed } from 'vue';
import UserAvatar from '@/components/user/UserAvatar.vue';
import { formatAccountNumber } from '@/services/api/header';
import { type RecordData } from '@/services/api/portal';
import { historyWinner, historyPlayer, historyCompletedAt, historyTime, type HistoryGameKind } from '@/services/api/gameHistory';

const props = defineProps<{ games: RecordData[]; kind: HistoryGameKind }>();
const rows = computed(() => props.games.map(game => ({
  game, winner: historyWinner(game, props.kind), completedAt: historyCompletedAt(game, props.kind),
  participants: [
    { side: 'creator', label: 'Создатель', user: historyPlayer(game, 'creator') },
    { side: 'player', label: 'Игрок', user: historyPlayer(game, 'player') },
  ],
})));
</script>
<template lang="pug">
ul.game-history(aria-label="История завершённых игр")
  li.history-row(v-for="row in rows" :key="row.game.id")
    .history-stake
      small.muted Игра №{{ row.game.id }}
      strong Ставка: {{ formatAccountNumber(row.game.kon) }} {{ kind === 'saper' ? 'Кг' : 'Cr' }}
      span.muted(v-if="row.winner === 'draw'") Ничья
      span.muted(v-else-if="row.winner === null") Результат недоступен
    .history-participant(v-for="participant in row.participants" :key="participant.side")
      small.muted {{ participant.label }}
      .participant-details
        user-avatar(v-if="participant.user" :user="participant.user")
        span.muted(v-else) Участник недоступен
        font-awesome-icon.winner(v-if="row.winner === participant.side" icon="trophy" role="img" title="Победитель" :aria-label="participant.label + ': победитель'")
    .history-time
      small.muted Завершена (МСК)
      time(v-if="row.completedAt !== null" :datetime="new Date(row.completedAt * 1000).toISOString()") {{ historyTime(row.completedAt) }}
      span(v-else) —
</template>
<style scoped>
.game-history { list-style: none; margin: 0; padding: 0; }
.history-row { display: grid; grid-template-columns: minmax(8rem, .8fr) repeat(2, minmax(0, 1.1fr)) minmax(10rem, 1fr); gap: 1rem; align-items: center; padding: 1rem 0; border-bottom: 1px solid var(--border); }
.history-row:last-child { border-bottom: 0; }
.history-stake, .history-participant, .history-time { display: grid; gap: .4rem; min-width: 0; }
.participant-details { display: flex; align-items: center; gap: .5rem; min-width: 0; }
.winner { color: var(--primary); flex: 0 0 auto; font-size: 1.2rem; }
.history-time { font-variant-numeric: tabular-nums; }
@media (max-width: 900px) { .history-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } .history-stake { grid-column: 1 / -1; } .history-time { grid-column: 1 / -1; } }
@media (max-width: 480px) { .history-row { grid-template-columns: minmax(0, 1fr); } }
</style>

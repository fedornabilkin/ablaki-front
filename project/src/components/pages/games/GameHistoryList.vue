<script setup lang="ts">
import { computed } from 'vue';
import UserAvatar from '@/components/user/UserAvatar.vue';
import { formatAccountNumber } from '@/services/api/header';
import { type RecordData } from '@/services/api/portal';
import { historyWinner, historyPlayer, historyCompletedAt, historyDateParts, type HistoryGameKind } from '@/services/api/gameHistory';

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
.history-scroll(role="region" aria-label="История завершённых игр" tabindex="0")
  table.game-history
    thead
      tr
        th(scope="col") Номер
        th(scope="col") Ставка
        th(scope="col") Создатель
        th(scope="col") Игрок
        th(scope="col") Дата и время (МСК)
    tbody
      tr(v-for="row in rows" :key="row.game.id")
        td {{ row.game.id }}
        td
          strong {{ formatAccountNumber(row.game.kon) }} {{ kind === 'saper' ? 'Кг' : 'Cr' }}
          small.result.muted(v-if="row.winner === 'draw'") Ничья
          small.result.muted(v-else-if="row.winner === null") Результат недоступен
        td(v-for="participant in row.participants" :key="participant.side")
          .participant-details
            user-avatar(v-if="participant.user" :user="participant.user")
            span.muted(v-else) Участник недоступен
            font-awesome-icon.winner(v-if="row.winner === participant.side" icon="trophy" role="img" title="Победитель" :aria-label="participant.label + ': победитель'")
        td.history-time
          time(v-if="row.completedAt !== null" :datetime="new Date(row.completedAt * 1000).toISOString()")
            span {{ historyDateParts(row.completedAt).date }}
            span.muted {{ historyDateParts(row.completedAt).time }}
          span(v-else) —
</template>
<style scoped>
.history-scroll { overflow-x: auto; }
.game-history { width: 100%; border-collapse: collapse; text-align: left; }
th, td { padding: .85rem .75rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
th { font-weight: 600; white-space: nowrap; }
th:first-child, td:first-child { padding-left: 0; }
tbody tr:last-child td { border-bottom: 0; }
.result { display: block; }
.participant-details { display: flex; align-items: center; gap: .5rem; min-width: 0; }
.participant-details :deep(.user-avatar) { min-width: 9rem; }
.winner { color: var(--primary); flex: 0 0 auto; font-size: 1.2rem; }
.history-time { font-variant-numeric: tabular-nums; white-space: nowrap; }
.history-time time { display: grid; gap: .2rem; }
</style>

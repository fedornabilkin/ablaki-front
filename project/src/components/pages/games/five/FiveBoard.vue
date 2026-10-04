<script setup lang="ts">
import { formatCredits } from '@/entities/world/credits';
import { computed } from 'vue';
import { NAlert, NButton, NCard, NPopconfirm } from 'naive-ui';
import UserAvatar from '@/components/user/UserAvatar.vue';
import { formatAccountNumber } from '@/services/api/header';
import { historyPlayer } from '@/services/api/gameHistory';
import { canMoveFive, fiveFinished, fiveRole, type FiveGame } from '@/services/api/fiveGame';
const props = defineProps<{ game: FiveGame; userId: number; credit: number; busy: boolean; blocked: boolean }>();
defineEmits<{ move: [ball: number]; cancel: [] }>();
const role = computed(() => fiveRole(props.game, props.userId));
const participants = computed(() => [
  { side: 'user', user: historyPlayer(props.game, 'creator'), points: props.game.user_points },
  { side: 'gamer', user: historyPlayer(props.game, 'player'), points: props.game.gamer_points },
]);
const winnerName = computed(() => String(props.game.status === 'user' ? props.game.username || 'Создатель' : props.game.username_gamer || 'Соперник'));
const ownPendingBall = computed(() => props.game.last_hod?.status === 'wait' ? (role.value === 'user' ? props.game.last_hod.user_ball : props.game.last_hod.gamer_ball) : undefined);
</script>
<template lang="pug">
n-card(:title="'Игра №' + game.id")
  .five-layout
    .stack
      .toolbar.five-stats
        span
          font-awesome-icon(icon="coins" aria-hidden="true")
          |  Ставка: {{ formatCredits(game.kon) }} Cr
        span
          font-awesome-icon(icon="box" aria-hidden="true")
          |  Банк: {{ formatCredits(game.bank) }} Cr
        span
          font-awesome-icon(icon="trophy" aria-hidden="true")
          |  Победителю: {{ formatCredits(game.winner_amount) }} Cr
      .players
        .player(v-for="participant in participants" :key="participant.side")
          user-avatar(v-if="participant.user" :user="participant.user")
          span.muted(v-else) Ждём соперника
          strong {{ participant.points }} очков
          font-awesome-icon(v-if="game.status === participant.side" icon="trophy" title="Победитель" aria-label="Победитель")
      n-alert(v-if="fiveFinished(game)" type="success" role="status") Победитель: {{ winnerName }}. Начислено {{ formatCredits(game.winner_amount) }} Cr.
      template(v-else)
        p(v-if="ownPendingBall") Ваш скрытый ход: {{ ownPendingBall }}. Ждём ответа соперника.
        template(v-if="canMoveFive(game, userId, credit)")
          p {{ game.status === 'free' ? 'Выберите число яблок: при вступлении спишется ставка.' : 'Ваш ход. Выберите число яблок:' }}
          .toolbar(role="group" aria-label="Число яблок")
            n-button(v-for="ball in [1, 2, 3, 4, 5]" :key="ball" :disabled="busy || blocked" type="primary" secondary @click="$emit('move', ball)")
              font-awesome-icon(icon="apple-alt")
              | &nbsp;{{ ball }}
        p.muted(v-else-if="game.status === 'free' && role !== 'user'") Недостаточно Cr для этой ставки.
        p.muted(v-else-if="!ownPendingBall") Ход соперника. Состояние обновляется автоматически.
        n-popconfirm(v-if="game.status === 'free' && role === 'user'" @positive-click="$emit('cancel')")
          template(#trigger)
            n-button(type="error" secondary :disabled="busy || blocked") Отменить игру
          | Отменить игру и вернуть {{ formatCredits(game.kon) }} Cr?
    aside.five-rounds(aria-label="Ходы игроков")
      strong Ходы
      .round-names
        span {{ game.username || 'Создатель' }}
        span {{ game.username_gamer || 'Соперник' }}
      .round-row(v-for="(round, index) in game.rounds" :key="round.id")
        span {{ game.rounds.length - index }}. {{ round.user_ball }}
        span {{ round.gamer_ball }}
        small.muted +{{ round.user_amount }} : +{{ round.gamer_amount }}
      p.muted(v-if="!game.rounds.length") Завершённых ходов пока нет.
</template>
<style scoped>
.five-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(13rem, 18rem); gap: 1.5rem; }
.five-stats svg { color: var(--primary); }
.players { display: flex; flex-wrap: wrap; gap: 2rem; }
.player { display: flex; align-items: center; gap: .75rem; }
.player > svg { color: var(--primary); }
.five-rounds { border-left: 1px solid var(--border); padding-left: 1rem; min-width: 0; }
.round-names, .round-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: .5rem; padding: .4rem 0; border-bottom: 1px solid var(--border); overflow-wrap: anywhere; }
.round-names { font-weight: 600; }
.round-row small { grid-column: 1 / -1; }
@media (max-width: 700px) { .five-layout { grid-template-columns: 1fr; } .five-rounds { border-left: 0; border-top: 1px solid var(--border); padding: 1rem 0 0; } }
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NCard, NPopconfirm } from 'naive-ui';
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
</script>
<template lang="pug">
n-card(:title="'Игра №' + game.id")
  .stack
    .toolbar
      span Ставка: {{ formatAccountNumber(game.kon) }} Cr
      span Банк: {{ formatAccountNumber(game.bank) }} Cr
      span Победителю: {{ formatAccountNumber(game.winner_amount) }} Cr
    small.muted Комиссия: {{ formatAccountNumber(game.commission) }} Cr (5% банка)
    .players
      .player(v-for="participant in participants" :key="participant.side")
        user-avatar(v-if="participant.user" :user="participant.user")
        span.muted(v-else) Ждём соперника
        strong {{ participant.points }} очков
        font-awesome-icon(v-if="game.status === participant.side" icon="trophy" title="Победитель" aria-label="Победитель")
    p(v-if="fiveFinished(game)" role="status") {{ game.status === role ? 'Вы победили!' : 'Игра завершена.' }} Победителю начислено {{ formatAccountNumber(game.winner_amount) }} Cr.
    template(v-else)
      p(v-if="game.last_hod && game.last_hod.status !== 'wait'") Последний раунд: {{ game.last_hod.user_ball }} : {{ game.last_hod.gamer_ball }}. Очки: +{{ game.last_hod.user_amount }} : +{{ game.last_hod.gamer_amount }}.
      p(v-if="game.last_hod?.status === 'wait' && role === 'user'") Ваш скрытый ход: {{ game.last_hod.user_ball }}. Ждём ответа соперника.
      template(v-if="canMoveFive(game, userId, credit)")
        p {{ game.status === 'free' ? 'Выберите число яблок: при вступлении спишется ставка.' : 'Ваш ход. Выберите число яблок:' }}
        .toolbar(role="group" aria-label="Число яблок")
          n-button(v-for="ball in [1, 2, 3, 4, 5]" :key="ball" :disabled="busy || blocked" type="primary" secondary @click="$emit('move', ball)")
            font-awesome-icon(icon="apple-alt")
            | &nbsp;{{ ball }}
      p.muted(v-else-if="game.status === 'free' && role !== 'user'") Недостаточно Cr для этой ставки.
      p.muted(v-else-if="game.turn !== role") Ход соперника. Состояние обновляется автоматически.
      n-popconfirm(v-if="game.status === 'free' && role === 'user'" @positive-click="$emit('cancel')")
        template(#trigger)
          n-button(type="error" secondary :disabled="busy || blocked") Отменить игру
        | Отменить игру и вернуть {{ formatAccountNumber(game.kon) }} Cr?
</template>
<style scoped>
.players { display: flex; flex-wrap: wrap; gap: 2rem; }
.player { display: flex; align-items: center; gap: .75rem; }
.player > svg { color: var(--primary); }
</style>

<script setup>
import { ref, computed } from "@vue/reactivity";
import { watch } from "vue";
import { useStore } from 'vuex';
import moment from "moment";
import { NCard, NButton, NSpin, useNotification } from 'naive-ui';
import { five } from '@/services/api/games/five.js';
import { errorHandler } from "@/services/api/errorHandler.js";

const props = defineProps({
  reloadListTrigger: { type: Boolean },
});

const emit = defineEmits(['newGameClick']);

const store = useStore();
const notification = useNotification();
const balls = [1, 2, 3, 4, 5];

const gamesList = ref([]);
const isLoading = ref(true);

const authUserId = computed(() => store.getters['auth/user']?.id);

// моя роль в партии: создатель (user) или соперник (gamer)
const myRole = (game) => {
  if (game.my_role) {
    return game.my_role;
  }
  return Number(authUserId.value) === Number(game.user_id) ? 'user' : 'gamer';
};

const myPoints = (game) => (myRole(game) === 'user' ? game.user_points : game.gamer_points);
const oppPoints = (game) => (myRole(game) === 'user' ? game.gamer_points : game.user_points);
const oppName = (game) => (myRole(game) === 'user' ? (game.username_gamer || '—') : game.username);
const isMyTurn = (game) => game.status === 'play' && game.turn === myRole(game);

const fetchGames = () => {
  isLoading.value = true;
  five.my()
      .then((res) => {
        gamesList.value = res.list.map((game) => ({
          ...game,
          createdDate: moment.unix(game.created_at).format("HH:mm:ss DD.MM.YYYY"),
          isLoading: false,
          isDeleting: false,
          lastHod: null,
          finished: false,
          error: null,
        }));
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        isLoading.value = false;
      });
};

watch(() => props.reloadListTrigger, fetchGames);

const onPlay = (row, ball) => {
  row.isLoading = true;
  row.error = null;
  five.play(row.id, ball)
      .then((res) => {
        Object.assign(row, res.game);
        row.lastHod = res.hod;
        row.finished = res.game.status === 'user' || res.game.status === 'gamer';
        if (res.gamer) {
          store.dispatch('auth/setData', res.gamer);
        }
      })
      .catch((e) => {
        errorHandler(e, (msg) => row.error = msg);
      })
      .finally(() => {
        row.isLoading = false;
      });
};

const onDelete = (row) => {
  row.isDeleting = true;
  five.delete(row.id)
      .then(() => {
        notification.success({ content: 'Партия удалена, ставка возвращена', duration: 4500 });
        fetchGames();
      })
      .catch((e) => {
        row.isDeleting = false;
        errorHandler(e, (msg) => notification.warning({
          content: msg || 'Что-то пошло не так',
          duration: 4500,
        }));
      });
};

const hodText = (row) => {
  const hod = row.lastHod;
  if (!hod) {
    return '';
  }
  if (hod.status === 'draw') {
    return `Раунд: ${hod.user_ball} на ${hod.gamer_ball} — ничья.`;
  }
  const mine = myRole(row) === hod.status;
  const amount = hod.status === 'user' ? hod.user_amount : hod.gamer_amount;
  return `Раунд: ${hod.user_ball} против ${hod.gamer_ball} — ${mine ? 'тебе' : 'сопернику'} +${amount}.`;
};

const isMyWin = (row) => row.status === myRole(row);

fetchGames();
</script>

<template lang="pug">
  n-spin(:show="isLoading")
    .five-games
      .five-empty(v-if="!isLoading && !gamesList.length")
        span У тебя нет незавершённых партий.
        n-button(text type="primary" @click="emit('newGameClick')") Создать
      n-card.game-card(v-for="row in gamesList" :key="row.id" :bordered="true")
        .game-row
          .game-info
            .game-user(v-if="row.status === 'free'")
              | Ждём соперника
              span.game-kon  · ставка {{ row.kon }}
              template(v-if="row.my_ball")
                span.game-kon  · твой ход:
                span.ball  {{ row.my_ball }}
            .game-user(v-else)
              | Против {{ oppName(row) }}
              span.game-kon  · ставка {{ row.kon }}
            .game-date {{ row.createdDate }}
          n-button(
            v-if="row.status === 'free'"
            size="small"
            type="error"
            secondary
            :loading="row.isDeleting"
            @click="onDelete(row)"
          )
            template(#icon)
              font-awesome-icon(icon='fa fa-trash-alt')
            | Удалить
        .game-play(v-if="row.status !== 'free'")
          .game-score
            span.me Ты {{ myPoints(row) }}
            span.sep :
            span.opp {{ oppPoints(row) }} {{ oppName(row) }}
            span.goal  (до 21)
          .game-hod(v-if="row.lastHod") {{ hodText(row) }}
          .game-error(v-if="row.error") {{ row.error }}
          template(v-if="row.finished")
            .game-result(:class="{ 'game-result--win': isMyWin(row) }")
              | {{ isMyWin(row) ? `Победа! Банк ${row.kon * 2} твой.` : 'Поражение. Банк уходит сопернику.' }}
          template(v-else-if="isMyTurn(row)")
            .game-actions
              span.hint {{ myRole(row) === 'user' ? 'Твой скрытый ход:' : 'Твой ход:' }}
              n-button(
                v-for="b in balls"
                :key="b"
                size="small"
                type="info"
                secondary
                :disabled="row.isLoading"
                @click="onPlay(row, b)"
              ) {{ b }}
          template(v-else)
            .game-wait Ход соперника.
</template>

<style lang="scss" scoped>
.five-games {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 6rem;

  .five-empty {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-muted);
    padding: 1rem 0;
  }

  .game-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .game-user {
    font-weight: 600;

    .game-kon {
      color: var(--text-muted);
      font-weight: 400;
    }

    .ball {
      color: var(--primary);
      font-weight: 700;
    }
  }

  .game-date {
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .game-play {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--primary-soft);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .game-score {
    font-weight: 700;

    .sep {
      margin: 0 0.35rem;
    }

    .me {
      color: var(--primary);
    }

    .goal {
      color: var(--text-muted);
      font-weight: 400;
      font-size: 0.85rem;
    }
  }

  .game-hod {
    color: var(--text-muted);
  }

  .game-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;

    .hint {
      color: var(--text-muted);
      font-size: 0.85rem;
      margin-right: 0.25rem;
    }
  }

  .game-result {
    font-weight: 600;

    &--win {
      color: var(--primary);
    }
  }

  .game-wait {
    color: var(--text-muted);
  }

  .game-error {
    color: #d03050;
  }
}
</style>

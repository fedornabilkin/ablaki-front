<script setup>
import { ref } from "@vue/reactivity";
import { watch } from "vue";
import { useStore } from 'vuex';
import moment from "moment";
import { NCard, NButton, NSpin } from 'naive-ui';
import { five } from '@/services/api/games/five.js';
import { errorHandler } from "@/services/api/errorHandler.js";

const props = defineProps({
  reloadListTrigger: { type: Boolean },
});

const emit = defineEmits(['newGameClick']);

const store = useStore();
const balls = [1, 2, 3, 4, 5];

const gamesList = ref([]);
const isLoading = ref(true);

const fetchGames = () => {
  isLoading.value = true;
  five.get()
      .then((games) => {
        gamesList.value = games.map((game) => ({
          ...game,
          createdDate: moment.unix(game.created_at).format("HH:mm:ss DD.MM.YYYY"),
          isLoading: false,
          active: null,
          lastHod: null,
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
  five.play(row.id, ball)
      .then((res) => {
        row.active = res.game;
        row.lastHod = res.hod;
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

// на этой странице я всегда соперник (gamer)
const hodText = (row) => {
  const hod = row.lastHod;
  if (!hod) {
    return '';
  }
  if (hod.status === 'draw') {
    return `Раунд: ${hod.user_ball} на ${hod.gamer_ball} — ничья.`;
  }
  if (hod.status === 'gamer') {
    return `Раунд: ${hod.user_ball} против ${hod.gamer_ball} — тебе +${hod.gamer_amount}.`;
  }
  return `Раунд: ${hod.user_ball} против ${hod.gamer_ball} — сопернику +${hod.user_amount}.`;
};

const isFinished = (row) => row.active && (row.active.status === 'user' || row.active.status === 'gamer');
const isMyWin = (row) => row.active && row.active.status === 'gamer';
const isMyTurn = (row) => row.active && row.active.status === 'play' && row.active.turn === 'gamer';

fetchGames();
</script>

<template lang="pug">
  n-spin(:show="isLoading")
    .five-games
      .five-empty(v-if="!isLoading && !gamesList.length")
        span Свободных партий нет.
        n-button(text type="primary" @click="emit('newGameClick')") Создай первую!
      n-card.game-card(v-for="row in gamesList" :key="row.id" :bordered="true")
        .game-row
          .game-info
            .game-user
              | {{ row.username }}
              span.game-kon  · ставка {{ row.kon }}
            .game-date {{ row.createdDate }}
          .game-actions(v-if="!row.active && !row.error")
            span.hint Вступить и сходить:
            n-button(
              v-for="b in balls"
              :key="b"
              size="small"
              type="info"
              secondary
              :disabled="row.isLoading"
              @click="onPlay(row, b)"
            ) {{ b }}
          .game-error(v-else-if="row.error") {{ row.error }}
        .game-play(v-if="row.active")
          .game-score
            span.me Ты {{ row.active.gamer_points }}
            span.sep :
            span.opp {{ row.active.user_points }} {{ row.username }}
            span.goal  (до 21)
          .game-hod {{ hodText(row) }}
          template(v-if="isFinished(row)")
            .game-result(:class="{ 'game-result--win': isMyWin(row) }")
              | {{ isMyWin(row) ? `Победа! Банк ${row.active.kon * 2} твой.` : 'Поражение. Банк уходит сопернику.' }}
          template(v-else-if="isMyTurn(row)")
            .game-actions
              span.hint Твой ход:
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
            .game-wait Ход соперника — продолжение в «Моих играх».
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
  }

  .game-date {
    color: var(--text-muted);
    font-size: 0.8rem;
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

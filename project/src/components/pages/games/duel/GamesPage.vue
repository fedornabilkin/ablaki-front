<script setup>
import { ref } from "@vue/reactivity";
import { watch } from "vue";
import { useStore } from 'vuex';
import moment from "moment";
import { NCard, NButton, NSpin } from 'naive-ui';
import { duel } from '@/services/api/games/duel.js';
import { errorHandler } from "@/services/api/errorHandler.js";
import { ZONES, zoneAccusative } from './zones.js';

const props = defineProps({
  reloadListTrigger: { type: Boolean },
});

const emit = defineEmits(['newGameClick']);

const store = useStore();

const gamesList = ref([]);
const isLoading = ref(true);

const fetchGames = () => {
  isLoading.value = true;
  duel.get()
      .then((games) => {
        gamesList.value = games.map((game) => ({
          ...game,
          createdDate: moment.unix(game.created_at).format("HH:mm:ss DD.MM.YYYY"),
          udar: null,
          blok: null,
          isLoading: false,
          result: null,
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

const onPlay = (row) => {
  row.isLoading = true;
  duel.play(row.id, row.udar, row.blok)
      .then((res) => {
        row.result = res.game;
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

// на этой странице я всегда соперник (gamer): мой удар u2/блок b2
const resultText = (row) => {
  const g = row.result;
  const winner = g.result;
  if (winner === 'draw') {
    const bothHit = g.u1 !== g.b2 && g.u2 !== g.b1;
    return bothHit
        ? `Размен ударами (он в ${zoneAccusative[g.u1]}, ты в ${zoneAccusative[g.u2]}) — ничья, ставки возвращаются.`
        : 'Оба удара пришлись в блок — ничья, ставки возвращаются.';
  }
  if (winner === 'gamer') {
    return `Твой удар в ${zoneAccusative[g.u2]} прошёл, его удар ты закрыл — победа! Банк ${g.kon * 2} твой.`;
  }
  return `Соперник пробил в ${zoneAccusative[g.u1]}, а твой удар ушёл в блок — поражение.`;
};

const isMyWin = (row) => row.result && row.result.result === 'gamer';
const isDraw = (row) => row.result && row.result.result === 'draw';

fetchGames();
</script>

<template lang="pug">
  n-spin(:show="isLoading")
    .duel-games
      .duel-empty(v-if="!isLoading && !gamesList.length")
        span Свободных схваток нет.
        n-button(text type="primary" @click="emit('newGameClick')") Создай первую!
      n-card.game-card(v-for="row in gamesList" :key="row.id" :bordered="true")
        .game-row
          .game-info
            .game-user
              | {{ row.username }}
              span.game-kon  · ставка {{ row.kon }}
            .game-date {{ row.createdDate }}
        template(v-if="!row.result && !row.error")
          .game-pick
            .pick-group
              span.hint
                font-awesome-icon(icon='fa fa-crosshairs')
                |  Удар:
              n-button(
                v-for="zone in ZONES"
                :key="zone.value"
                size="small"
                type="error"
                :secondary="zone.value !== row.udar"
                :disabled="row.isLoading"
                @click="row.udar = zone.value"
              ) {{ zone.label }}
            .pick-group
              span.hint
                font-awesome-icon(icon='fa fa-shield')
                |  Блок:
              n-button(
                v-for="zone in ZONES"
                :key="zone.value"
                size="small"
                type="info"
                :secondary="zone.value !== row.blok"
                :disabled="row.isLoading"
                @click="row.blok = zone.value"
              ) {{ zone.label }}
            n-button(
              type="primary"
              size="small"
              :disabled="!row.udar || !row.blok"
              :loading="row.isLoading"
              @click="onPlay(row)"
            ) В бой!
        .game-result(v-else-if="row.result" :class="{ 'game-result--win': isMyWin(row), 'game-result--draw': isDraw(row) }")
          | {{ resultText(row) }}
        .game-error(v-else) {{ row.error }}
</template>

<style lang="scss" scoped>
.duel-games {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 6rem;

  .duel-empty {
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

  .game-pick {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--primary-soft);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }

  .pick-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;

    .hint {
      color: var(--text-muted);
      font-size: 0.85rem;

      svg {
        color: var(--primary);
      }
    }
  }

  .game-result {
    margin-top: 0.75rem;
    font-weight: 600;

    &--win {
      color: var(--primary);
    }

    &--draw {
      color: var(--text-muted);
    }
  }

  .game-error {
    margin-top: 0.75rem;
    color: #d03050;
  }
}
</style>

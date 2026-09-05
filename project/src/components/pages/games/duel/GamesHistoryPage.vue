<script setup>
import { ref } from "@vue/reactivity";
import { watch } from "vue";
import moment from "moment";
import { NCard, NTable, NSpin } from 'naive-ui';
import { duel } from '@/services/api/games/duel.js';
import { zoneName } from './zones.js';

const props = defineProps({
  reloadListTrigger: { type: Boolean },
});

const gamesList = ref([]);
const isLoading = ref(true);

const fetchGames = () => {
  isLoading.value = true;
  duel.getHistory()
      .then((res) => {
        gamesList.value = res.list.map((game) => ({
          ...game,
          playedDate: moment.unix(game.updated_at).format("HH:mm:ss DD.MM.YYYY"),
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

const resultText = (game) => {
  if (game.result === 'draw') {
    return 'Ничья';
  }
  const winner = game.result === 'user' ? game.username : game.username_gamer;
  return `${winner} +${game.kon * 2}`;
};

fetchGames();
</script>

<template lang="pug">
  n-spin(:show="isLoading")
    .duel-history
      .duel-empty(v-if="!isLoading && !gamesList.length") Сыгранных схваток пока нет.
      n-card(v-else :bordered="true")
        n-table(:bordered="false" :single-line="false")
          thead
            tr
              th Создатель
              th Удар / Блок
              th Соперник
              th Удар / Блок
              th Итог
              th Когда
          tbody
            tr(v-for="game in gamesList" :key="game.id")
              td {{ game.username }}
              td.zones {{ zoneName(game.u1) }} / {{ zoneName(game.b1) }}
              td {{ game.username_gamer }}
              td.zones {{ zoneName(game.u2) }} / {{ zoneName(game.b2) }}
              td(:class="{ draw: game.result === 'draw', winner: game.result !== 'draw' }") {{ resultText(game) }}
              td.date {{ game.playedDate }}
</template>

<style lang="scss" scoped>
.duel-history {
  min-height: 6rem;

  .duel-empty {
    color: var(--text-muted);
    padding: 1rem 0;
  }

  .zones {
    color: var(--primary);
    font-weight: 600;
  }

  .winner {
    color: var(--primary);
    font-weight: 600;
  }

  .draw {
    color: var(--text-muted);
  }

  .date {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
}
</style>

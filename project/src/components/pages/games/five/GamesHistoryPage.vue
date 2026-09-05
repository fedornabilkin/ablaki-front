<script setup>
import { ref } from "@vue/reactivity";
import { watch } from "vue";
import moment from "moment";
import { NCard, NTable, NSpin } from 'naive-ui';
import { five } from '@/services/api/games/five.js';

const props = defineProps({
  reloadListTrigger: { type: Boolean },
});

const gamesList = ref([]);
const isLoading = ref(true);

const fetchGames = () => {
  isLoading.value = true;
  five.getHistory()
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

const winnerName = (game) => (game.status === 'user' ? game.username : game.username_gamer);

fetchGames();
</script>

<template lang="pug">
  n-spin(:show="isLoading")
    .five-history
      .five-empty(v-if="!isLoading && !gamesList.length") Сыгранных партий пока нет.
      n-card(v-else :bordered="true")
        n-table(:bordered="false" :single-line="false")
          thead
            tr
              th Создатель
              th Соперник
              th Счёт
              th Победитель
              th Банк
              th Когда
          tbody
            tr(v-for="game in gamesList" :key="game.id")
              td {{ game.username }}
              td {{ game.username_gamer }}
              td.score {{ game.user_points }} : {{ game.gamer_points }}
              td.winner {{ winnerName(game) }}
              td {{ game.kon * 2 }}
              td.date {{ game.playedDate }}
</template>

<style lang="scss" scoped>
.five-history {
  min-height: 6rem;

  .five-empty {
    color: var(--text-muted);
    padding: 1rem 0;
  }

  .score {
    font-weight: 700;
  }

  .winner {
    color: var(--primary);
    font-weight: 600;
  }

  .date {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
}
</style>

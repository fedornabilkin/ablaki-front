<script setup>
import { ref } from "@vue/reactivity";
import { computed, onScopeDispose, watch } from "vue";
import { useStore } from 'vuex';
import moment from "moment";
import { NCard, NButton, NSpin, useNotification } from 'naive-ui';
import { duel } from '@/services/api/games/duel.js';
import { errorHandler } from "@/services/api/errorHandler.js";
import { zoneName } from './zones.js';
import GameStakeFilter from '../GameStakeFilter.vue';
import { useListQuery } from '@/hooks/useListQuery';

const props = defineProps({
  reloadListTrigger: { type: Boolean },
});

const emit = defineEmits(['newGameClick']);

const notification = useNotification();
const store = useStore();
const gamesList = ref([]);
const isLoading = ref(true);
const listError = ref('');
const { filters } = useListQuery({ kon: '' });
const selectedStake = computed({ get: () => filters.value.kon, set: kon => { filters.value = { kon }; } });
let requestVersion = 0;
onScopeDispose(() => { requestVersion++; });

const fetchGames = () => {
  const version = ++requestVersion;
  isLoading.value = true;
  listError.value = '';
  duel.my(1, selectedStake.value)
      .then((res) => {
        if (version !== requestVersion) return;
        gamesList.value = res.list.map((game) => ({
          ...game,
          createdDate: moment.unix(game.created_at).format("HH:mm:ss DD.MM.YYYY"),
          isDeleting: false,
        }));
      })
      .catch((err) => {
        if (version === requestVersion) errorHandler(err, message => { listError.value = message || 'Не удалось загрузить игры.'; });
      })
      .finally(() => {
        if (version === requestVersion) isLoading.value = false;
      });
};

watch(() => props.reloadListTrigger, fetchGames);
watch(selectedStake, fetchGames);
watch(() => store.state.auth.revision, () => { gamesList.value = []; fetchGames(); });

const onDelete = (row) => {
  if (row.isDeleting) return;
  row.isDeleting = true;
  duel.delete(row.id)
      .then(async () => {
        notification.success({ content: 'Схватка удалена, ставка возвращена', duration: 4500 });
        fetchGames();
        await store.dispatch('auth/fetchData');
      })
      .catch((e) => {
        row.isDeleting = false;
        errorHandler(e, (msg) => notification.warning({
          content: msg || 'Что-то пошло не так',
          duration: 4500,
        }));
      });
};

fetchGames();
</script>

<template lang="pug">
  game-stake-filter.mb-3(v-model="selectedStake" kind="duel" scope="my" :version="gamesList" :disabled="gamesList.some(row => row.isDeleting)")
  p(v-if="listError" role="alert") {{ listError }}
    n-button(text @click="fetchGames") Повторить
  n-spin(:show="isLoading")
    .duel-games
      .duel-empty(v-if="!isLoading && !gamesList.length")
        span У тебя нет открытых схваток.
        n-button(text type="primary" @click="emit('newGameClick')") Создать
      n-card.game-card(v-for="row in gamesList" :key="row.id" :bordered="true")
        .game-row
          .game-info
            .game-user
              | Ждём соперника
              span.game-kon  · ставка {{ row.kon }}
            .game-pick(v-if="row.u1")
              span Удар:
              span.zone  {{ zoneName(row.u1) }}
              span.sep  ·
              span  Блок:
              span.zone  {{ zoneName(row.b1) }}
            .game-date {{ row.createdDate }}
          n-button(
            size="small"
            type="error"
            secondary
            :loading="row.isDeleting"
            @click="onDelete(row)"
          )
            template(#icon)
              font-awesome-icon(icon='fa fa-trash-alt')
            | Удалить
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

  .game-pick {
    color: var(--text-muted);
    font-size: 0.9rem;

    .zone {
      color: var(--primary);
      font-weight: 600;
    }
  }

  .game-date {
    color: var(--text-muted);
    font-size: 0.8rem;
  }
}
</style>

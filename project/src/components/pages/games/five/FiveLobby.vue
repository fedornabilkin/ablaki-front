<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NCard, NInputNumber, NModal, NPopconfirm } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import PagePager from '@/components/PagePager.vue';
import RequestState from '@/components/RequestState.vue';
import GameStakeFilter from '../GameStakeFilter.vue';
import UserAvatar from '@/components/user/UserAvatar.vue';
import FiveBoard from './FiveBoard.vue';
import GameToolbar from '../GameToolbar.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { usePageRequest } from '@/hooks/usePageRequest';
import { useFiveGame } from '@/hooks/useFiveGame';
import { list, emptyPage, person, mutate, errorText } from '@/services/api/portal';
import { fiveGame } from '@/services/api/fiveGame';
import { historyPlayer } from '@/services/api/gameHistory';
import { formatAccountNumber } from '@/services/api/header';

const store = useStore();
const route = useRoute();
const session = computed(() => store.state.auth.revision);
const userId = computed(() => Number(store.getters['auth/user']?.id));
const available = computed(() => person(store.getters['auth/user']).credit);
const credit = computed(() => Number(available.value));
const mine = computed(() => route.path.endsWith('/my'));
const { page, filters, params } = useListQuery({ kon: '' });
const selectedStake = computed({ get: () => filters.value.kon, set: kon => { filters.value = { ...filters.value, kon }; } });
const games = usePageRequest(async () => {
  const result = await list(mine.value ? 'five/my' : 'five', page.value, { ...params.value, q: undefined });
  return { ...result, items: result.items.map(fiveGame) };
}, emptyPage(), [mine, page, params, session]);
const play = useFiveGame(session, () => store.dispatch('auth/fetchData'), games.refresh);
const showCreate = ref(false);
const deleting = ref(false);
const deleteError = ref('');
watch(() => route.query.create, value => { if (value === '1') showCreate.value = true; }, { immediate: true });
async function remove(id: number) {
  if (deleting.value || play.busy.value) return;
  deleting.value = true; deleteError.value = '';
  const revision = session.value;
  try {
    await mutate('five/' + id, 'delete');
    if (session.value !== revision) return;
    await games.refresh();
    await store.dispatch('auth/fetchData');
  } catch (cause) { if (session.value === revision) deleteError.value = errorText(cause); }
  finally { deleting.value = false; }
}
const stake = ref<number | null>(10);
const firstBall = ref(3);
const validCreate = computed(() => stake.value !== null && Number.isFinite(stake.value) && stake.value >= 1 && stake.value <= credit.value);
watch([mine, session], () => { play.close(); showCreate.value = route.query.create === '1'; });
async function create() {
  if (!validCreate.value || stake.value === null) return;
  const currentSession = session.value;
  const currentPath = route.path;
  await play.create(stake.value, firstBall.value);
  if (session.value === currentSession && route.path === currentPath && !play.error.value) showCreate.value = false;
}
</script>
<template lang="pug">
page-header(page-title="5 яблок")
  game-toolbar(kind="five" :busy="play.busy.value || deleting" @create="showCreate = true" @changed="games.refresh(); play.close()")
.container.page.stack
  p.muted Каждый раунд оба игрока выбирают от 1 до 5 яблок. Равные числа — ничья. При разнице в одно яблоко меньшее число получает сумму чисел очками; иначе большее число получает разность. Побеждает первый, набравший 21 очко. Выплата — две ставки за вычетом комиссии 5%.
  n-alert(v-if="play.error.value" type="error" title="Не удалось обновить игру") {{ play.error.value }} Обновите состояние перед следующим ходом.
  n-alert(v-if="play.notice.value" type="info") {{ play.notice.value }}
  n-alert(v-if="deleteError" type="error") {{ deleteError }}
  template(v-if="play.game.value")
    .toolbar
      n-button(:disabled="play.busy.value" @click="play.close()") К списку игр
    five-board(:game="play.game.value" :user-id="userId" :credit="credit" :busy="play.busy.value" :blocked="play.loading.value || !!play.error.value" @move="play.move" @cancel="play.cancel")
  n-card(v-else :title="mine ? 'Мои игры' : 'Доступные игры'")
    .stack
      game-stake-filter(v-model="selectedStake" kind="five" :scope="mine ? 'my' : 'available'" :version="games.data.value" :disabled="play.busy.value || deleting")
      request-state(:loading="games.loading.value" :error="games.error.value" :empty="!games.data.value.items.length" @retry="games.refresh")
        .game-row(v-for="game in games.data.value.items" :key="game.id")
          span №{{ game.id }}
          user-avatar(v-if="historyPlayer(game, 'creator')" :user="historyPlayer(game, 'creator')!")
          span {{ formatAccountNumber(game.kon) }} Cr
          span {{ game.status === 'free' ? 'Ждём соперника' : 'Идёт игра' }}
          n-button(type="primary" secondary :disabled="play.busy.value" @click="play.open(fiveGame(game))") {{ mine ? 'Открыть' : 'Участвовать' }}
          n-popconfirm(v-if="mine && game.status === 'free' && Number(game.user_id) === userId" @positive-click="remove(game.id)")
            template(#trigger)
              n-button(:disabled="deleting || play.busy.value") Удалить
            | Удалить игру №{{ game.id }} и вернуть ставку?
      page-pager(v-if="!games.error.value" v-model:page="page" :result="games.data.value" :disabled="games.loading.value")
n-modal(:show="showCreate" preset="card" title="Новая игра «5 яблок»" style="width: min(500px, 95vw)" :mask-closable="!play.busy.value" :closable="!play.busy.value" @update:show="value => { if (!play.busy.value) showCreate = value; }")
  .stack
    label Ставка (Cr)
      n-input-number(v-model:value="stake" :min="1" :max="Number.isFinite(credit) ? credit : undefined" :disabled="play.busy.value")
    p Доступно: {{ formatAccountNumber(available) }} Cr. Ставка резервируется при создании.
    p Ваш первый скрытый ход:
    .toolbar(role="group" aria-label="Первый ход")
      n-button(v-for="ball in [1, 2, 3, 4, 5]" :key="ball" :type="firstBall === ball ? 'primary' : 'default'" :aria-pressed="firstBall === ball" :disabled="play.busy.value" @click="firstBall = ball") {{ ball }}
    n-alert(v-if="play.error.value" type="error") {{ play.error.value }}
    n-button(type="primary" :loading="play.busy.value" :disabled="!validCreate || play.busy.value" @click="create") Создать
</template>
<style scoped>
.game-row { display: flex; align-items: center; flex-wrap: wrap; gap: 1rem; padding: .75rem 0; border-bottom: 1px solid var(--border); }
.game-row > button { margin-left: auto; }
</style>

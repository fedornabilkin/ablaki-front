<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NCard, NForm, NFormItem, NInputNumber, NModal, NPopconfirm } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import PagePager from '@/components/PagePager.vue';
import RequestState from '@/components/RequestState.vue';
import GameStakeFilter from './GameStakeFilter.vue';
import GameQuickStats from './GameQuickStats.vue';
import SaperBoard from './saper/SaperBoard.vue';
import RecentGames from './RecentGames.vue';
import GameHistoryList from './GameHistoryList.vue';
import GameToolbar from './GameToolbar.vue';
import SaperSuggestions from './saper/SaperSuggestions.vue';
import { list, emptyPage, mutate, person, field, date, errorText, type RecordData } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
import { useListQuery } from '@/hooks/useListQuery';
import { useQuickGames } from '@/hooks/useQuickGames';
import { gameSummary, type GameSummary } from '@/services/api/gameOverview';
const route = useRoute();
const store = useStore();
const session = computed(() => store.state.auth.revision);
const saper = computed(() => route.path.startsWith('/games/saper'));
const kind = computed(() => saper.value ? 'saper' : 'orel');
const mode = computed(() => route.path.endsWith('/my') ? 'my' : route.path.endsWith('/history') ? 'history' : '');
const unit = computed(() => saper.value ? 'Кг' : 'Cr');
const available = computed(() => person(store.getters['auth/user'])[saper.value ? 'balance' : 'credit']);
const canPlay = (game: RecordData) => Number.isFinite(Number(available.value)) && Number(game.kon) > 0 && Number(available.value) >= Number(game.kon);
const { page, filters, params } = useListQuery({ kon: '' });
const selectedStake = computed({ get: () => filters.value.kon, set: kon => { filters.value = { ...filters.value, kon }; } });
const { data, loading, error, refresh } = usePageRequest(() => list(kind.value + (mode.value ? '/' + mode.value : ''), page.value, { ...params.value, q: undefined }), emptyPage(), [kind, mode, page, params, session]);
const overviewVersion = ref(0);
const { data: summary, loading: summaryLoading, error: summaryError, refresh: refreshSummary } = usePageRequest<GameSummary | null>(() => gameSummary(kind.value), null, [kind, session]);
watch(overviewVersion, () => { void refreshSummary(); });
const showCreate = ref(false);
const kon = ref<number | null>(5);
const count = ref<number | null>(1);
const busy = ref(false);
const actionError = ref('');
const notice = ref('');
const noticeType = ref<'success' | 'warning' | 'info'>('info');
const selected = ref<RecordData | null>(null);
const completed = ref(false);
const { rows: playedRows, submit: submitQuick } = useQuickGames(session,
  (id, hod) => mutate('orel/play/' + id, 'post', { hod }),
  async () => {
    const revision = session.value;
    overviewVersion.value++;
    try { await store.dispatch('auth/fetchData'); }
    catch { if (!disposed && session.value === revision) actionError.value = 'Не удалось обновить счёт. Обновите профиль.'; }
  });
function quickPlay(game: RecordData, hod: number) {
  if ((hod !== 1 && hod !== 2) || saper.value || mode.value || !canPlay(game)) return;
  void submitQuick(game.id, hod);
}
watch(selected, () => { completed.value = false; });
watch(() => route.query.create, value => { if (value === '1') showCreate.value = true; }, { immediate: true });
watch([kind, mode, session], () => { selected.value = null; showCreate.value = route.query.create === '1'; actionError.value = ''; notice.value = ''; });
let disposed = false;
onBeforeUnmount(() => { disposed = true; });
const validCreate = computed(() => kon.value !== null && Number.isFinite(kon.value) && kon.value >= (saper.value ? .01 : 1) && count.value !== null && Number.isInteger(count.value) && count.value >= 1 && count.value <= 100 && kon.value * count.value <= Number(available.value));
async function act(path: string, method: 'post' | 'delete', body?: unknown) {
  if (busy.value) return;
  busy.value = true; actionError.value = ''; notice.value = '';
  const currentKind = kind.value;
  const currentPath = route.fullPath;
  const revision = store.state.auth.revision;
  const current = () => !disposed && revision === store.state.auth.revision && currentKind === kind.value && currentPath === route.fullPath;
  try {
    const response = await mutate(path, method, body);
    if (!current()) return;
    if (path.includes('/play/')) {
      const game = response && typeof response === 'object' && 'game' in response ? response.game : null;
      if (!game || typeof game !== 'object' || !('win' in game) || typeof game.win !== 'boolean') {
        notice.value = 'Ход отправлен. Проверьте результат в истории игр.';
        noticeType.value = 'info';
      } else {
        notice.value = game.win ? 'Вы выиграли!' : 'Вы проиграли.';
        noticeType.value = game.win ? 'success' : 'warning';
      }
    } else {
      notice.value = method === 'delete' ? 'Игра отменена.' : 'Игра создана.';
      noticeType.value = 'success';
    }
    showCreate.value = false; selected.value = null;
    overviewVersion.value++;
    await refresh();
    if (!current()) return;
    try { await store.dispatch('auth/fetchData'); }
    catch { if (current()) actionError.value = 'Операция выполнена, но счёт не обновился. Обновите профиль перед следующей игрой.'; }
  } catch (cause) { if (current()) actionError.value = errorText(cause); }
  finally { busy.value = false; }
}
function refreshAll() {
  overviewVersion.value++;
  void refresh();
}
async function accountChange() {
  const revision = session.value;
  overviewVersion.value++;
  void refresh();
  try { await store.dispatch('auth/fetchData'); }
  catch { if (!disposed && revision === session.value) actionError.value = 'Не удалось обновить счёт. Обновите профиль.'; }
}
</script>
<template lang="pug">
page-header(:page-title="saper ? 'Сапёр' : 'Орлянка'")
  game-toolbar(:kind="kind" :busy="busy || (!!selected && !completed)" @create="showCreate = true" @changed="refreshAll")
.container.page.stack
  .quick-stats-sticky(:aria-busy="summaryLoading")
    game-quick-stats(v-if="summary" :summary="summary" :unit="unit" :kind="kind")
    request-state(v-else :loading="summaryLoading" :error="summaryError" @retry="refreshSummary")
    n-button(v-if="summary && summaryError" size="tiny" @click="refreshSummary") Повторить обновление статистики
  n-alert(v-if="actionError" type="error") {{ actionError }}
  n-alert(v-if="notice" :type="noticeType") {{ notice }}
  saper-board(v-if="saper && selected" :key="selected.id" :game="selected" @close="selected = null; refreshAll()" @account-change="accountChange" @complete="completed = true")
  saper-suggestions(v-if="saper && selected && completed" :key="selected.id" :stake="Number(selected.kon)" :balance="Number(available)" :session="session" @select="selected = $event")
  n-card
    game-stake-filter.mb-3(v-model="selectedStake" :kind="kind" :scope="mode === 'my' ? 'my' : 'available'" :version="overviewVersion" :disabled="busy")
    request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
      game-history-list(v-if="mode === 'history'" :games="data.items" :kind="kind")
      .record-row(v-for="game in (mode === 'history' ? [] : data.items)" :key="game.id" :class="{ 'played-row': playedRows[game.id] }")
        div
          strong Игра №{{ game.id }} · {{ field(game.kon) }} {{ unit }}
          .muted
            router-link(v-if="typeof game.username === 'string' && game.username" :to="'/wall/' + encodeURIComponent(game.username)") {{ game.username }}
            span(v-else) Участник недоступен
            |  · {{ date(game.created_at) }}
        .toolbar
          n-popconfirm(v-if="mode === 'my'" @positive-click="act(kind + '/' + game.id, 'delete')")
            template(#trigger)
              n-button(:disabled="busy") Удалить
            | Отменить игру №{{ game.id }}?
          template(v-else-if="!saper")
            span.game-result(role="status" :class="playedRows[game.id]?.result" :aria-label="playedRows[game.id]?.text" :title="playedRows[game.id]?.text")
              font-awesome-icon(v-if="playedRows[game.id]" :icon="playedRows[game.id].result === 'pending' ? 'spinner' : playedRows[game.id].result === 'error' ? 'circle-exclamation' : 'circle'" :spin="playedRows[game.id].result === 'pending'" aria-hidden="true")
            n-button(v-for="side in [1, 2]" :key="side" :disabled="(!!playedRows[game.id] && playedRows[game.id].result !== 'error') || !canPlay(game)" :aria-label="(side === 1 ? 'Орёл' : 'Решка') + ': сыграть за ' + game.kon + ' Cr'" :title="(side === 1 ? 'Орёл' : 'Решка') + ': сыграть за ' + game.kon + ' Cr'" @click="quickPlay(game, side)")
              font-awesome-icon.coin-side(icon="circle" :class="{ hollow: side === 1 }" aria-hidden="true")
          n-button(v-else :disabled="busy || (!!selected && !completed) || !canPlay(game)" @click="selected = game") Играть
    page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading || busy")
  recent-games(:key="kind" :kind="kind" :version="overviewVersion")
n-modal(v-model:show="showCreate" preset="card" title="Создать игру" :style="{ width: 'min(27.5rem, calc(100vw - 2rem))' }" :mask-closable="!busy" :closable="!busy" :close-on-esc="!busy")
  n-form(@submit.prevent="validCreate && act(kind, 'post', { kon, count })")
    p.muted Созданные игры доступны другим участникам. До начала их можно отменить во вкладке «Мои игры».
    n-form-item(:label="'Ставка, ' + unit" :label-props="{ for: 'game-kon' }")
      n-input-number(:input-props="{ id: 'game-kon' }" v-model:value="kon" :min="saper ? .01 : 1" :disabled="busy")
    n-form-item(label="Количество игр" :label-props="{ for: 'game-count' }")
      n-input-number(:input-props="{ id: 'game-count' }" v-model:value="count" :min="1" :max="100" :precision="0" :disabled="busy")
    p Итого: {{ kon && count ? kon * count : 0 }} {{ unit }}
    n-alert.mb-3(v-if="actionError" type="error") {{ actionError }}
    n-button(type="primary" attr-type="submit" :loading="busy" :disabled="!validCreate") Создать и списать ставку
n-modal(:show="!saper && !!selected" preset="card" title="Орёл или решка?" :style="{ width: 'min(27.5rem, calc(100vw - 2rem))' }" :mask-closable="!busy" :closable="!busy" :close-on-esc="!busy" @update:show="!busy && (selected = null)")
  template(v-if="selected")
    p Игра №{{ selected.id }} · Ставка {{ field(selected.kon) }} Cr
    p.muted Выбор стороны сразу отправляет ход и списывает ставку.
    n-alert.mb-3(v-if="actionError" type="error") {{ actionError }}
    .toolbar
      n-button(type="primary" :loading="busy" @click="act('orel/play/' + selected.id, 'post', { hod: 1 })") Орёл
      n-button(:disabled="busy" @click="act('orel/play/' + selected.id, 'post', { hod: 2 })") Решка
</template>
<style scoped lang="scss">
.game-totals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; }
.game-totals > div { display: flex; flex-direction: column; gap: .25rem; }
.game-totals strong { font-size: clamp(1rem, 3vw, 1.5rem); overflow-wrap: anywhere; }
.quick-stats-sticky { position: sticky; top: var(--site-header-height, 4rem); z-index: 20; background: var(--bg-base); }
.game-result { display: inline-flex; align-items: center; justify-content: center; width: 1.25rem; height: 1.25rem; flex: 0 0 1.25rem; color: var(--primary); font-size: .85rem; }.game-result.win { color: #4ade80; }.game-result.loss, .game-result.error { color: #f87171; }
.coin-side { font-size: 1rem; }
.coin-side.hollow :deep(path) { fill: none; stroke: currentColor; stroke-width: 35; }
</style>

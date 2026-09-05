<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NCard, NForm, NFormItem, NInputNumber, NModal, NPopconfirm } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import PagePager from '@/components/PagePager.vue';
import RequestState from '@/components/RequestState.vue';
import ListFilters from '@/components/ListFilters.vue';
import SaperBoard from './saper/SaperBoard.vue';
import RecentGames from './RecentGames.vue';
import { list, emptyPage, mutate, person, field, date, errorText, type RecordData } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
import { useListQuery } from '@/hooks/useListQuery';
import { gameSummary, playerOutcome, signedAmount, type GameSummary } from '@/services/api/gameOverview';
const route = useRoute();
const store = useStore();
const session = computed(() => store.state.auth.revision);
const saper = computed(() => route.path.startsWith('/games/saper'));
const kind = computed(() => saper.value ? 'saper' : 'orel');
const mode = computed(() => route.path.endsWith('/my') ? 'my' : route.path.endsWith('/history') ? 'history' : '');
const unit = computed(() => saper.value ? 'Кг' : 'Cr');
const available = computed(() => person(store.getters['auth/user'])[saper.value ? 'balance' : 'credit']);
const canPlay = (game: RecordData) => Number.isFinite(Number(available.value)) && Number(game.kon) > 0 && Number(available.value) >= Number(game.kon);
const { page, search, filters, params, reset } = useListQuery({ kon: '' });
const filterDefinitions = [{ key: 'kon', label: 'Кон', type: 'number' as const }];
const { data, loading, error, refresh } = usePageRequest(() => list(kind.value + (mode.value ? '/' + mode.value : ''), page.value, params.value), emptyPage(), [kind, mode, page, params, session]);
const overviewVersion = ref(0);
const { data: summary, loading: summaryLoading, error: summaryError, refresh: refreshSummary } = usePageRequest<GameSummary | null>(() => gameSummary(kind.value), null, [kind, overviewVersion, session]);
const links = computed(() => [
  { link: '/games', title: '← Игры' },
  { link: '/games/' + kind.value, title: 'Доступные игры' },
  { link: '/games/' + kind.value + '/my', title: 'Мои игры' },
  { link: '/games/' + kind.value + '/history', title: 'История' },
]);
const showCreate = ref(false);
const kon = ref<number | null>(5);
const count = ref<number | null>(1);
const busy = ref(false);
const actionError = ref('');
const notice = ref('');
const noticeType = ref<'success' | 'warning' | 'info'>('info');
const selected = ref<RecordData | null>(null);
watch([kind, mode], () => { selected.value = null; showCreate.value = false; actionError.value = ''; notice.value = ''; });
let disposed = false;
onBeforeUnmount(() => { disposed = true; });
const validCreate = computed(() => kon.value !== null && Number.isFinite(kon.value) && kon.value >= (saper.value ? .01 : 1) && count.value !== null && Number.isInteger(count.value) && count.value >= 1 && count.value <= 100 && kon.value * count.value <= Number(available.value));
async function act(path: string, method: 'post' | 'delete', body?: unknown) {
  if (busy.value) return;
  busy.value = true; actionError.value = ''; notice.value = '';
  const currentKind = kind.value;
  const currentPath = route.path;
  const revision = store.state.auth.revision;
  const current = () => !disposed && revision === store.state.auth.revision && currentKind === kind.value && currentPath === route.path;
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
  try { await store.dispatch('auth/fetchData'); }
  catch { if (!disposed && revision === session.value) actionError.value = 'Не удалось обновить счёт. Обновите профиль.'; }
}
</script>
<template lang="pug">
page-header(:page-title="saper ? 'Сапёр' : 'Орлянка'" :extra-links="links")
  template(#actions)
    n-button(type="primary" :disabled="busy || !!selected" @click="showCreate = true") Создать игру
.container.page.stack
  .toolbar
    strong Доступно: {{ field(available) }} {{ unit }}
    n-button(:loading="loading" :disabled="busy || !!selected" @click="refreshAll") Обновить
  n-card(title="Сегодня")
    request-state(:loading="summaryLoading" :error="summaryError" @retry="refreshSummary")
      template(v-if="summary")
        .game-totals
          div
            small.muted Сыграно
            strong {{ summary.today.played }}
          div
            small.muted Побед
            strong {{ summary.today.wins }}
          div
            small.muted Итог по счёту
            strong {{ signedAmount(summary.today.balance) }} {{ unit }}
        p.muted.mt-3 Итог включает все операции с этой игрой за день, в том числе создание и отмену. Часовой пояс: {{ summary.today.timezone }}.
        p(v-if="summary.own.count")
          router-link(:to="'/games/' + kind + '/my'") Мои доступные игры: {{ summary.own.count }}
          |  · На сумму {{ field(summary.own.amount) }} {{ unit }}
        p.muted(v-else) У вас пока нет доступных игр.
  n-alert(v-if="actionError" type="error") {{ actionError }}
  n-alert(v-if="notice" :type="noticeType") {{ notice }}
  saper-board(v-if="saper && selected" :key="selected.id" :game="selected" @close="selected = null; refreshAll()" @account-change="accountChange")
  n-card(v-else)
    list-filters.mb-3(v-model:search="search" v-model:values="filters" :filters="filterDefinitions" :loading="loading" @reset="reset")
    p.muted(v-if="!mode") Поиск по игроку или номеру игры. Ставка списывается при участии.
    request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
      .record-row(v-for="game in data.items" :key="game.id")
        div
          strong Игра №{{ game.id }} · {{ field(game.kon) }} {{ unit }}
          .muted
            router-link(v-if="typeof game.username === 'string' && game.username" :to="'/wall/' + encodeURIComponent(game.username)") {{ game.username }}
            span(v-else) Участник недоступен
            |  · {{ date(mode === 'history' ? (game.completed_at ?? game.updated_at) : game.created_at) }}
        .toolbar
          template(v-if="mode === 'history'")
            font-awesome-icon.winner(v-if="playerOutcome(game, store.getters['auth/user']) === 'Победа'" icon="crown" title="Победа" aria-label="Победа")
            span {{ playerOutcome(game, store.getters['auth/user']) }}
          n-popconfirm(v-else-if="mode === 'my'" @positive-click="act(kind + '/' + game.id, 'delete')")
            template(#trigger)
              n-button(:disabled="busy") Отменить
            | Отменить игру №{{ game.id }}?
          n-button(v-else :disabled="busy || !canPlay(game)" @click="selected = game") Играть
    page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading || busy")
  recent-games(:key="kind" :kind="kind" :version="overviewVersion")
n-modal(v-model:show="showCreate" preset="card" title="Создать игру" :style="{ width: 'min(440px, calc(100vw - 32px))' }" :mask-closable="!busy" :closable="!busy" :close-on-esc="!busy")
  n-form(@submit.prevent="validCreate && act(kind, 'post', { kon, count })")
    p.muted Созданные игры доступны другим участникам. До начала их можно отменить во вкладке «Мои игры».
    n-form-item(:label="'Ставка, ' + unit" :label-props="{ for: 'game-kon' }")
      n-input-number(:input-props="{ id: 'game-kon' }" v-model:value="kon" :min="saper ? .01 : 1" :disabled="busy")
    n-form-item(label="Количество игр" :label-props="{ for: 'game-count' }")
      n-input-number(:input-props="{ id: 'game-count' }" v-model:value="count" :min="1" :max="100" :precision="0" :disabled="busy")
    p Итого: {{ kon && count ? kon * count : 0 }} {{ unit }}
    n-alert.mb-3(v-if="actionError" type="error") {{ actionError }}
    n-button(type="primary" attr-type="submit" :loading="busy" :disabled="!validCreate") Создать и списать ставку
n-modal(:show="!saper && !!selected" preset="card" title="Орёл или решка?" :style="{ width: 'min(440px, calc(100vw - 32px))' }" :mask-closable="!busy" :closable="!busy" :close-on-esc="!busy" @update:show="!busy && (selected = null)")
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
.winner { color: var(--primary); }
</style>

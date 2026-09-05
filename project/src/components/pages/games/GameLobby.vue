<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NCard, NForm, NFormItem, NInputNumber, NModal, NPopconfirm } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import PagePager from '@/components/PagePager.vue';
import RequestState from '@/components/RequestState.vue';
import SaperBoard from './saper/SaperBoard.vue';
import { list, emptyPage, mutate, person, field, date, errorText, type RecordData } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
const route = useRoute();
const store = useStore();
const saper = computed(() => route.path.startsWith('/games/saper'));
const kind = computed(() => saper.value ? 'saper' : 'orel');
const mode = computed(() => route.path.endsWith('/my') ? 'my' : route.path.endsWith('/history') ? 'history' : '');
const unit = computed(() => saper.value ? 'Кг' : 'Cr');
const available = computed(() => person(store.getters['auth/user'])[saper.value ? 'balance' : 'credit']);
const canPlay = (game: RecordData) => Number.isFinite(Number(available.value)) && Number(game.kon) > 0 && Number(available.value) >= Number(game.kon);
const page = ref(1);
watch([kind, mode], () => { page.value = 1; });
const { data, loading, error, refresh } = usePageRequest(() => list(kind.value + (mode.value ? '/' + mode.value : ''), page.value), emptyPage(), [kind, mode, page]);
const links = computed(() => [
  { link: '/games', title: '← Игры' },
  { link: '/games/' + kind.value, title: 'Доступные игры' },
  ...(!saper.value ? [{ link: '/games/orel/my', title: 'Мои игры' }, { link: '/games/orel/history', title: 'История' }] : []),
]);
const showCreate = ref(false);
const kon = ref<number | null>(5);
const count = ref<number | null>(1);
const busy = ref(false);
const actionError = ref('');
const notice = ref('');
const noticeType = ref<'success' | 'warning' | 'info'>('info');
const selected = ref<RecordData | null>(null);
watch(kind, () => { selected.value = null; showCreate.value = false; actionError.value = ''; notice.value = ''; });
const validCreate = computed(() => kon.value !== null && Number.isFinite(kon.value) && kon.value >= (saper.value ? .01 : 1) && count.value !== null && Number.isInteger(count.value) && count.value >= 1 && count.value <= 100 && kon.value * count.value <= Number(available.value));
async function act(path: string, method: 'post' | 'delete', body?: unknown) {
  if (busy.value) return;
  busy.value = true; actionError.value = ''; notice.value = '';
  const currentKind = kind.value;
  const revision = store.state.auth.revision;
  try {
    const response = await mutate(path, method, body);
    if (revision !== store.state.auth.revision || currentKind !== kind.value) return;
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
    await refresh();
    try { await store.dispatch('auth/fetchData'); }
    catch { actionError.value = 'Операция выполнена, но счёт не обновился. Обновите профиль перед следующей игрой.'; }
  } catch (cause) { actionError.value = errorText(cause); }
  finally { busy.value = false; }
}
function outcome(game: RecordData) {
  if (typeof game.win !== 'boolean') return 'Нет результата';
  const wasGamer = game.username_gamer === store.getters['auth/user']?.username;
  return game.win === wasGamer ? 'Победа' : 'Поражение';
}
</script>
<template lang="pug">
page-header(:page-title="saper ? 'Сапёр' : 'Орлянка'" :extra-links="links")
  template(#actions)
    n-button(type="primary" :disabled="busy || !!selected" @click="showCreate = true") Создать игру
.container.page.stack
  .toolbar
    strong Доступно: {{ field(available) }} {{ unit }}
    n-button(:loading="loading" :disabled="busy || !!selected" @click="refresh") Обновить список
  n-alert(v-if="actionError" type="error") {{ actionError }}
  n-alert(v-if="notice" :type="noticeType") {{ notice }}
  saper-board(v-if="saper && selected" :key="selected.id" :game="selected" @close="selected = null; refresh()" @account-change="store.dispatch('auth/fetchData').catch(() => { actionError = 'Не удалось обновить счёт. Обновите профиль.'; })")
  n-card(v-else)
    p.muted(v-if="!mode") Показаны первые 20 доступных игр. Ставка списывается при участии.
    request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
      .record-row(v-for="game in data.items" :key="game.id")
        div
          strong Игра №{{ game.id }} · {{ field(game.kon) }} {{ unit }}
          .muted
            router-link(:to="'/wall/' + encodeURIComponent(field(game.username))") {{ field(game.username) }}
            |  · {{ date(game.created_at) }}
        .toolbar
          span(v-if="mode === 'history'") {{ outcome(game) }}
          n-popconfirm(v-else-if="mode === 'my'" @positive-click="act(kind + '/' + game.id, 'delete')")
            template(#trigger)
              n-button(:disabled="busy") Отменить
            | Отменить игру №{{ game.id }}?
          n-button(v-else :disabled="busy || !canPlay(game)" @click="selected = game") Играть
    page-pager(v-if="mode && !error" v-model:page="page" :result="data" :disabled="loading || busy")
n-modal(v-model:show="showCreate" preset="card" title="Создать игру" :style="{ width: 'min(440px, calc(100vw - 32px))' }" :mask-closable="!busy" :closable="!busy" :close-on-esc="!busy")
  n-form(@submit.prevent="validCreate && act(kind, 'post', { kon, count })")
    p.muted(v-if="saper") Созданные игры доступны другим участникам. Просмотр и отмена своих игр в сапёре пока недоступны.
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

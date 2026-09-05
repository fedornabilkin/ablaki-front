<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { useStore } from 'vuex';
import { isAxiosError } from 'axios';
import { NAlert, NButton, NCard, useDialog } from 'naive-ui';
import { startSaper, mutate, field, errorText, type RecordData } from '@/services/api/portal';
const props = defineProps<{ game: RecordData }>();
const emit = defineEmits<{ close: []; 'account-change': [] }>();
const dialog = useDialog();
const store = useStore();
const row = ref(5);
const started = ref(false);
const busy = ref(false);
const complete = ref(false);
const uncertain = ref(false);
const message = ref('');
const error = ref('');
const moves = ref<Record<number, number>>({});
const lostCell = ref<number | null>(null);
let disposed = false;
async function start() {
  if (busy.value || started.value) return;
  busy.value = true; error.value = '';
  const revision = store.state.auth.revision;
  try {
    await startSaper(props.game.id);
    if (disposed || revision !== store.state.auth.revision) return;
    started.value = true;
    emit('account-change');
  } catch (cause) {
    if (disposed || revision !== store.state.auth.revision) return;
    error.value = errorText(cause);
    if (isAxiosError(cause) && (!cause.response || cause.response.status >= 500)) uncertain.value = true;
  } finally { busy.value = false; }
}
async function play(col: number) {
  if (busy.value || !started.value || complete.value || uncertain.value) return;
  busy.value = true; error.value = '';
  const revision = store.state.auth.revision;
  try {
    await mutate('saper/play/' + props.game.id, 'post', { row: row.value, col });
    if (disposed || revision !== store.state.auth.revision) return;
    moves.value[row.value] = col;
    row.value--;
    if (row.value === 0) { complete.value = true; message.value = 'Вы прошли поле. Победа!'; emit('account-change'); }
  } catch (cause) {
    if (disposed || revision !== store.state.auth.revision) return;
    const response = isAxiosError(cause) ? cause.response : undefined;
    // The existing backend signals a confirmed loss with a specific 400 response.
    const lost = response?.status === 400 && ['Game lost', 'Игра проиграна'].includes(response.data?.message);
    if (lost) {
      lostCell.value = col; complete.value = true; message.value = 'Мина. Игра проиграна.'; emit('account-change');
    } else {
      error.value = errorText(cause);
      uncertain.value = true;
    }
  } finally { busy.value = false; }
}
function warnUnload(event: BeforeUnloadEvent) {
  if (busy.value || (started.value && !complete.value)) { event.preventDefault(); event.returnValue = ''; }
}
window.addEventListener('beforeunload', warnUnload);
onBeforeUnmount(() => { disposed = true; window.removeEventListener('beforeunload', warnUnload); });
function confirmLeave() {
  if (!store.getters['auth/isAuthenticated']) return true;
  if (!busy.value && (!started.value || complete.value)) return true;
  if (busy.value) return false;
  return new Promise<boolean>(resolve => {
    dialog.warning({ title: 'Игра ещё идёт', content: 'После ухода со страницы восстановить поле пока нельзя. Покинуть игру?', positiveText: 'Покинуть', negativeText: 'Остаться', onPositiveClick: () => resolve(true), onNegativeClick: () => resolve(false), onClose: () => resolve(false), onMaskClick: () => resolve(false) });
  });
}
onBeforeRouteLeave(confirmLeave);
onBeforeRouteUpdate((to, from) => to.path === from.path || confirmLeave());
</script>
<template lang="pug">
n-card(:title="'Игра №' + game.id")
  .stack
    p Ставка: {{ field(game.kon) }} Кг. Выбирайте по одной клетке в каждом ряду, снизу вверх.
    p.muted(v-if="!started") Завершите игру на этой странице: восстановление поля после перезагрузки пока недоступно.
    n-alert(v-if="error" type="error") {{ error }}
    n-alert(v-if="uncertain" type="warning") Статус операции не подтверждён. Продолжение остановлено, чтобы не отправить ход повторно. Номер игры: {{ game.id }}.
    n-alert(v-if="message" :type="lostCell ? 'warning' : 'success'") {{ message }}
    .minefield(role="group" aria-label="Игровое поле")
      template(v-for="r in 5" :key="r")
        n-button(v-for="col in 7" :key="r + '-' + col" :aria-label="'Ряд ' + r + ', клетка ' + col" :type="moves[r] === col ? 'primary' : 'default'" :disabled="busy || !started || complete || uncertain || row !== r" @click="play(col)")
          | {{ moves[r] === col ? '✓' : lostCell === col && row === r ? '×' : '·' }}
    .toolbar
      n-button(v-if="!started && !uncertain" type="primary" :loading="busy" @click="start") Начать за {{ field(game.kon) }} Кг
      n-button(v-if="!started || complete" :disabled="busy" @click="$emit('close')") К списку
      span(v-if="started && !complete && !uncertain") Сейчас ряд {{ row }}
</template>
<style scoped lang="scss">
.minefield { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; max-width: 420px; }
.minefield :deep(.n-button) { padding: 0; height: 44px; font-size: 1.25rem; }
</style>

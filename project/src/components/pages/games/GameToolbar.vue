<script setup lang="ts">
import { computed, ref, onScopeDispose } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NPopover, NPopconfirm } from 'naive-ui';
import CreateButton from '@/components/CreateButton.vue';
import { mutate, errorText } from '@/services/api/portal';
import type { HistoryGameKind } from '@/services/api/gameHistory';
const props = withDefaults(defineProps<{ kind: HistoryGameKind; busy?: boolean; inlineCreate?: boolean }>(), { inlineCreate: true });
const emit = defineEmits<{ create: []; changed: [] }>();
const store = useStore();
const route = useRoute();
const removing = ref(false);
const error = ref('');
const notice = ref('');
const base = computed(() => '/games/' + props.kind);
const tabs = computed(() => [{ to: base.value, label: 'Игры', icon: 'users' }, { to: base.value + '/my', label: 'Мои', icon: 'user' }, { to: base.value + '/history', label: 'История', icon: 'calendar-days' }]);
const help = computed(() => props.kind === 'saper'
  ? 'Выберите игру и нажмите «Начать». Затем открывайте по одной клетке в каждом ряду снизу вверх. Мина завершает игру; пройти все ряды — победа.'
  : props.kind === 'duel'
    ? 'Выбери удар по противнику и блок для себя: голова, корпус или ноги. Удар проходит, если противник не закрыл эту зону. Попал только один — он забирает банк (две ставки). Попали оба или оба удара в блок — ничья, ставки возвращаются.'
    : props.kind === 'five'
      ? 'Каждый игрок выбирает от одного до пяти яблок за ход. Первый набравший 21 очко побеждает.'
      : 'Выберите орла или решку. После выбора ставка списывается и результат показывается сразу.');
let disposed = false;
onScopeDispose(() => { disposed = true; });
async function removeAll() {
  if (props.busy || removing.value) return;
  const revision = store.state.auth.revision;
  const path = route.path;
  const current = () => !disposed && revision === store.state.auth.revision && path === route.path;
  removing.value = true; error.value = ''; notice.value = '';
  try {
    const result = await mutate(props.kind + '/remove', 'delete') as { deleted: number };
    if (!current()) return;
    notice.value = result.deleted ? `Удалено игр: ${result.deleted}. Ставки возвращены на счёт.` : 'Нет не начатых игр для удаления.';
    emit('changed');
    await store.dispatch('auth/fetchData');
  } catch (cause) { if (current()) error.value = errorText(cause); }
  finally { removing.value = false; }
}
</script>
<template lang="pug">
.stack
  nav.toolbar(aria-label="Управление играми")
    create-button(v-if="inlineCreate" :disabled="busy || removing" @click="emit('create')")
    router-link(v-else :to="{ path: base, query: { create: '1' } }" custom v-slot="{ href, navigate }")
      n-button.create-link(tag="a" :href="href" type="primary" aria-label="Создать" @click="navigate")
        template(#icon)
          font-awesome-icon(icon="fa fa-plus")
        span Создать
    router-link(v-for="tab in tabs" :key="tab.to" :to="tab.to" custom v-slot="{ href, navigate, isExactActive }")
      n-button.game-tab(tag="a" :href="href" :type="isExactActive ? 'primary' : 'default'" :aria-label="tab.label" @click="navigate")
        template(#icon)
          font-awesome-icon(:icon="tab.icon")
        span.game-tab-label {{ tab.label }}
    n-popconfirm(:positive-button-props="{ disabled: busy || removing }" @positive-click="removeAll")
      template(#trigger)
        n-button.game-delete(type="error" secondary :disabled="busy || removing" :loading="removing" aria-label="Удалить все свои не начатые игры" title="Удалить все свои не начатые игры")
          template(#icon)
            font-awesome-icon(icon="trash-alt")
          span.game-delete-label Удалить
      | Удалить все свои не начатые игры этого типа и вернуть ставки на счёт? Начатые игры сохранятся.
    n-popover(trigger="click" placement="bottom-end" :style="{ maxWidth: 'calc(100vw - 2rem)' }")
      template(#trigger)
        n-button.game-help-trigger(aria-label="Правила игры" title="Правила игры" text)
          font-awesome-icon(icon="exclamation" aria-hidden="true")
      p.game-help {{ help }}
  n-alert(v-if="error" type="error") {{ error }}
  n-alert(v-if="notice" type="success") {{ notice }}
</template>
<style scoped>
.game-help { width: min(20rem, calc(100vw - 4rem)); max-width: 100%; margin: 0; overflow-wrap: anywhere; }
.game-help-trigger { position: absolute; top: 1rem; right: 1rem; font-size: 1.1rem; }
@media (max-width: 600px) { .create-link span, .game-tab-label, .game-delete-label { display: none; } .create-link :deep(.n-button__icon), .game-tab :deep(.n-button__icon), .game-delete :deep(.n-button__icon) { margin: 0; } }
</style>

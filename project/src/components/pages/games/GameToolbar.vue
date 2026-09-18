<script setup lang="ts">
import { computed, ref, onScopeDispose } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NPopconfirm } from 'naive-ui';
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
const tabs = computed(() => [{ to: base.value, label: 'Игры' }, { to: base.value + '/my', label: 'Мои' }, { to: base.value + '/history', label: 'История' }]);
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
      n-button(tag="a" :href="href" :type="isExactActive ? 'primary' : 'default'" @click="navigate") {{ tab.label }}
    n-popconfirm(:positive-button-props="{ disabled: busy || removing }" @positive-click="removeAll")
      template(#trigger)
        n-button(:disabled="busy || removing" :loading="removing") Удалить
      | Удалить все свои не начатые игры этого типа и вернуть ставки на счёт? Начатые игры сохранятся.
  n-alert(v-if="error" type="error") {{ error }}
  n-alert(v-if="notice" type="success") {{ notice }}
</template>
<style scoped>
@media (max-width: 600px) { .create-link span { display: none; } .create-link :deep(.n-button__icon) { margin: 0; } }
</style>

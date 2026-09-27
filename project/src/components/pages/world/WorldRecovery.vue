<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { useStore } from 'vuex';
import { NAlert, NButton, NSpin } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { useWorldCommand } from '@/hooks/useWorldCommand';
import { worldError } from '@/services/api/world';
import { loadRecovery, previewRecovery } from '@/services/api/worldStorage';
const auth = useStore(), { page } = useListQuery();
const session = computed(() => Number(auth.state.auth.revision)), owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0));
const state = shallowRef<Awaited<ReturnType<typeof loadRecovery>> | null>(null), calculation = shallowRef<Awaited<ReturnType<typeof previewRecovery>> | null>(null);
const loading = ref(false), previewing = ref(false), error = ref(''), notice = ref('');
let generation = 0, previewGeneration = 0, disposed = false;
const command = useWorldCommand(session, owner, () => { notice.value = 'Действие выполнено. Список обновлён.'; void load(); });
const { busy, pending, error: commandError } = command;
async function load() {
  const current = ++generation; previewGeneration++; state.value = null; calculation.value = null; previewing.value = false; loading.value = true; error.value = '';
  try { const value = await loadRecovery(page.value); if (!disposed && current === generation) state.value = value; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
async function preview(id: number) {
  if (busy.value || pending.value || !state.value?.writable) return;
  const current = ++previewGeneration; previewing.value = true; calculation.value = null; error.value = ''; notice.value = '';
  try { const value = await previewRecovery(id); if (!disposed && current === previewGeneration) calculation.value = value; }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) previewing.value = false; }
}
function recover() { if (calculation.value && state.value?.writable && !busy.value && !pending.value) void command.submit('/storage/recover', { inventory_id: calculation.value.inventory_id }, calculation.value.quote); }
watch([session, owner, page], () => { notice.value = ''; void load(); }, { immediate: true, flush: 'sync' });
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
page-header(pageTitle="Восстановление вещей")
.container.recovery
  router-link(to="/world") Вернуться в мир
  p Здесь доступны ваши вещи из разрушенных и архивных объектов. Сундуки сохраняют содержимое. Забрать вещи можно в свободные доступные ячейки; складывать новые вещи в восстановление нельзя.
  n-alert(v-if="error || commandError" type="error" role="alert") {{ error || commandError }}
  n-alert(v-if="notice" type="success" role="status") {{ notice }}
  n-alert(v-if="pending" type="info")
    p Ответ на действие ещё не получен.
    n-button(:loading="busy" @click="command.retry") Повторить запрос
  n-spin(v-if="loading" aria-label="Загрузка вещей")
  template(v-else-if="state")
    router-link(v-if="state.recovery_storage_id" :to="`/world/storage/${state.recovery_storage_id}`") Открыть восстановленные вещи
    p(v-if="!state.items.length") Вещей, ожидающих восстановления, нет.
    ul
      li(v-for="item in state.items" :key="item.inventory_id")
        span {{ item.name }} × {{ item.quantity }} · объект №{{ item.node_id }}
        n-button(:disabled="busy || Boolean(pending) || previewing || !state.writable" @click="preview(item.inventory_id)") Восстановить
    page-pager(v-model:page="page" :result="state" :disabled="loading || busy")
    section(v-if="calculation")
      p Переместить {{ calculation.name }} × {{ calculation.quantity }} в восстановление вместе с содержимым?
      n-button(type="primary" :loading="busy" :disabled="Boolean(pending) || !state.writable" @click="recover") Подтвердить
</template>
<style scoped>
.recovery { display: grid; gap: 1rem; padding-bottom: 2rem; }
.recovery ul { padding: 0; list-style: none; display: grid; gap: .75rem; }
.recovery li { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem; }
</style>

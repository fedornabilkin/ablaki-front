<script setup lang="ts">
import { worldActionButtonTheme } from '@/entities/world/theme';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton, NSelect } from 'naive-ui';
import { loadMining, parseMining, type MiningState } from '@/services/api/worldMining';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { worldError } from '@/services/api/world';
import { formatDuration } from '@/entities/world/duration';
import { loadStorageList, type StorageHeader } from '@/services/api/worldStorage';
import WorldHelpHint from './WorldHelpHint.vue';
import WorldWorkProgress from './WorldWorkProgress.vue';
const props = defineProps<{ nodeId: number; owner: number; session: number; writable: boolean }>();
const emit = defineEmits<{ changed: [] }>();
const state = ref<MiningState | null>(null), error = ref('');
const storages = ref<StorageHeader[]>([]), selectedStorage = ref<number | null>(null);
const storageOptions = computed(() => storages.value.map(storage => ({ value: storage.id, label: `${storage.name} · ${storage.capacity} мест` })));
const selectedAction = ref<string | null>(null);
const selected = computed(() => state.value?.actions?.find(action => action.code === (state.value?.action_code ?? selectedAction.value)) ?? state.value?.actions?.[0]);
const options = computed(() => state.value?.actions?.map(action => ({ value: action.code, label: action.output.map(item => `${item.name} × ${item.quantity}`).join(', ') })) ?? []);
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.${props.nodeId}.mining`), computed(() => props.session));
const checking = ref(false);
const progress = computed(() => ({ worked_seconds: state.value?.actions ? state.value.worked_seconds ?? 0 : (state.value?.worked_seconds ?? 0) % Math.max(1, state.value?.seconds_per_unit ?? 1),
  required_seconds: state.value?.action_code ? state.value.required_seconds ?? selected.value?.work_seconds ?? 1 : selected.value?.work_seconds ?? state.value?.seconds_per_unit ?? 1,
  working: !!state.value?.working, server_time: state.value?.server_time ?? 0, live_work: state.value?.live_work ?? [] }));
let generation = 0, readRevision = 0, disposed = false, reading = false;
async function load() {
  const current = generation, read = ++readRevision; reading = true;
  try { const result = await loadMining(props.nodeId); if (!disposed && current === generation && read === readRevision) { state.value = result; error.value = ''; } }
  catch (cause) { if (!disposed && current === generation && read === readRevision) error.value = worldError(cause); }
  finally { if (current === generation && read === readRevision) reading = false; }
}
async function loadDestinations() {
  const current = generation;
  try { const result = await loadStorageList(null); if (!disposed && current === generation) storages.value = result.filter(storage => ['backpack', 'stockpile', 'chest'].includes(storage.kind)); }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
}
async function act(action: 'start' | 'heartbeat' | 'stop', retry = false) {
  if (runner.busy.value || (!retry && runner.pending.value)) return;
  readRevision++; reading = false;
  checking.value = action === 'heartbeat' && !retry;
  const current = generation; error.value = '';
  const result = retry ? await runner.retry() : await runner.submit(`objects/${props.nodeId}/mining/${action}`, action === 'start' && selected.value ? { action_code: selected.value.code, ...(selectedStorage.value === null ? {} : { output_storage_id: selectedStorage.value }) } : {});
  if (result && !disposed && current === generation) { try { const next = parseMining(result); const delivered = next.produced_quantity !== state.value?.produced_quantity; state.value = next; if (delivered) emit('changed'); } catch (cause) { error.value = worldError(cause); } }
  if (current === generation) checking.value = false;
}
watch(() => [props.nodeId, props.session], () => { generation++; reading = false; state.value = null; storages.value = []; selectedStorage.value = null; selectedAction.value = null; error.value = ''; void load(); void loadDestinations(); }, { immediate: true });
const timer = setInterval(() => {
  if (runner.busy.value || runner.pending.value || reading) return;
  if (state.value?.working) void act('heartbeat'); else void load();
}, 10_000);
function refreshVisible() { if (!document.hidden && !runner.busy.value && !runner.pending.value && !reading) void load(); }
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', refreshVisible);
onScopeDispose(() => { disposed = true; generation++; clearInterval(timer); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', refreshVisible); });
</script>
<template lang="pug">
section.mining-panel(aria-label="Получение ресурсов")
  .mining-heading
    h3 Получение ресурсов
    world-help-hint(label="Как учитывается добыча")
      p Работа учитывается при открытой странице и связи с сервером; после обрыва — не более 60 секунд. Выдачу ресурсов подтверждает сервер.
      p(v-if="selected?.cooldown_seconds") Восстановление источника после получения: {{ formatDuration(selected.cooldown_seconds) }}.
      p(v-if="selected?.tool_names?.length") Нужен исправный инструмент: {{ selected.tool_names.join(', ') }}.
      p(v-if="selected?.experience") Опыт за партию: +{{ selected.experience }}.
      p Результат поступает в выбранное хранилище, по умолчанию — в рюкзак. Для прежних шахт используется склад шахты или рюкзак владельца.
  n-alert(v-if="error || runner.error.value" type="error") {{ error || runner.error.value }}
  template(v-if="state")
    p(v-if="!state.ready") Постройте буровую установку внутри шахты, чтобы начать добычу.
    template(v-else)
      template(v-if="state.actions")
        n-select(:value="selected?.code" :options="options" :disabled="state.working || !!state.action_code || runner.busy.value || !!runner.pending.value" aria-label="Ресурс для добычи" @update:value="selectedAction = $event")
        p(v-if="selected") {{ selected.output.map(item => `${item.name} × ${item.quantity}`).join(', ') }}
        p(v-if="!state.action_code && (selected?.available_at ?? 0) > state.server_time") Следующая партия доступна: {{ new Date((selected?.available_at ?? 0) * 1000).toLocaleString('ru-RU') }}.
        n-select(v-if="storageOptions.length" :value="state.output_storage_id ?? selectedStorage" :options="storageOptions" clearable placeholder="Рюкзак" :disabled="!!state.action_code || runner.busy.value || !!runner.pending.value" aria-label="Хранилище результата" @update:value="selectedStorage = $event")
        p(v-if="state.quota") Доступно партий сегодня: {{ state.quota.remaining }} из {{ state.quota.maximum }}.
        n-alert(v-if="state.blocked_message" type="warning") {{ state.blocked_message }}. Заработанная партия сохранена.
      template(v-else)
        p Работников: {{ state.workers }}. Добыто: {{ state.produced_quantity }} ед. руды.
      world-work-progress(v-if="progress.required_seconds > 0" :snapshot="progress" :identity="`${nodeId}.${state.work_id ?? state.action_code ?? 'idle'}.${state.produced_quantity}`" :syncing="runner.busy.value" @check="act('heartbeat')")
      p(v-if="state.pending_quantity") Ожидает выдачи: {{ state.pending_quantity }}. Освободите место в хранилище.
      n-button(:theme-overrides="worldActionButtonTheme" v-if="!state.working" type="primary" :loading="runner.busy.value" :disabled="!writable || !!runner.pending.value || (!state.pending_quantity && (state.quota?.remaining === 0 || (!state.action_code && (selected?.available_at ?? 0) > state.server_time)))" @click="state.pending_quantity ? act('heartbeat') : act('start')") {{ state.pending_quantity || selected?.work_seconds === 0 ? 'Получить готовую партию' : state.actions ? 'Работать над партией' : 'Добывать руду' }}
      n-button(:theme-overrides="worldActionButtonTheme" v-else :loading="runner.busy.value && !checking" :disabled="runner.busy.value || !!runner.pending.value" @click="act('stop')") Приостановить добычу
  n-button(:theme-overrides="worldActionButtonTheme" v-if="runner.pending.value" :loading="runner.busy.value" @click="act('heartbeat', true)") Повторить запрос
</template>
<style scoped>
.mining-panel { display: grid; gap: .75rem; }.mining-panel p, .mining-panel h3 { margin: 0; }
.mining-heading { display: flex; align-items: start; justify-content: space-between; gap: .5rem; }
</style>

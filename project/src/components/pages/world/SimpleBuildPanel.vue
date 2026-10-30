<script setup lang="ts">
import AppDialog from '@/components/AppDialog.vue';
import WorldCredits from '@/components/pages/world/WorldCredits.vue';
import { worldActionButtonTheme, worldDangerButtonTheme, worldModalTheme } from '@/entities/world/theme';
import WorldHelpHint from './WorldHelpHint.vue';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton, NModal, NProgress, NSpin, NTooltip } from 'naive-ui';
import BuildSettingsModal from './modals/BuildSettingsModal.vue';
import WorldBuildResults from './WorldBuildResults.vue';
import { projectedBuildSeconds } from '@/entities/world/buildProgress';
import * as api from '@/services/api/simpleWorld';
import { worldError } from '@/services/api/world';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { formatCredits } from '@/entities/world/credits';
const props = withDefaults(defineProps<{ node: api.SimpleNode; owner: number; session: number; templateId?: number; embedded?: boolean; active?: boolean; showResult?: boolean }>(), { active: true, showResult: true });
const emit = defineEmits<{ changed: [] }>();
const router = useRouter(), project = ref<api.Build | null>(null);
const error = ref(''), working = ref(false), otherWork = ref<number | null>(null);
const loading = ref(true);
const settingsOpen = ref(false), elapsed = ref(0), displayedSeconds = ref(0);
const cancelOpen = ref(false);
const resultVisible = ref(false);
let observedBuildId: number | null = null;
function dismissResult() { resultVisible.value = false; }
let receivedAt = performance.now();
const seconds = computed(() => displayedSeconds.value);
const maximum = computed(() => project.value?.max_condition ?? Math.max(1, Math.ceil((project.value?.required_seconds ?? 0) * 100 / 60)));
const repairing = computed(() => project.value?.job_kind === 'repair');
const strength = computed(() => { const initial = project.value?.initial_condition ?? 0; return Math.min(maximum.value, initial + Math.floor(seconds.value * (maximum.value - initial) / Math.max(1, project.value?.required_seconds ?? 1))); });
function accept(build: api.Build) {
  if (project.value?.id !== build.id || build.status === 'building') dismissResult();
  // A receipt is a live notification, never a result restored from history.
  if (build.status === 'building') observedBuildId = foreground.value && props.showResult ? build.id : null;
  else {
    if (observedBuildId === build.id && foreground.value && props.showResult) resultVisible.value = true;
    observedBuildId = null;
  }
  const initial = projectedBuildSeconds(build, 0);
  displayedSeconds.value = project.value?.id === build.id && build.status === 'building' && build.live_work?.length ? Math.min(build.required_seconds, Math.max(displayedSeconds.value, initial)) : initial;
  project.value = build; receivedAt = performance.now(); elapsed.value = 0;
}
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.${props.node.id}.build`), computed(() => props.session));
const busy = runner.busy, uncertain = computed(() => !!runner.pending.value && !busy.value);
let epoch = 0, disposed = false, timer: ReturnType<typeof setInterval> | undefined;
const polling = ref(false);
let completionAttempt = 0;
let nextHeartbeatAt = 0;
const visible = usePageVisibility(), foreground = computed(() => visible.value && props.active !== false);
watch([() => props.node.id, () => props.owner, () => props.session], () => { observedBuildId = null; dismissResult(); }, { flush: 'sync' });
watch([foreground, () => props.showResult], ([active, selected]) => { if (!active || !selected) { observedBuildId = null; dismissResult(); } }, { flush: 'sync' });
const animation = setInterval(() => {
  elapsed.value = (performance.now() - receivedAt) / 1000;
  if (project.value) displayedSeconds.value = Math.max(displayedSeconds.value, projectedBuildSeconds(project.value, elapsed.value));
  if (foreground.value && working.value && project.value?.status === 'building' && seconds.value >= project.value.required_seconds && !busy.value && !uncertain.value && performance.now() >= nextHeartbeatAt && performance.now() - completionAttempt > 1000) {
    completionAttempt = performance.now(); void send(`builds/${project.value.id}/heartbeat`);
  }
}, 100);
const sync = setInterval(() => { if (foreground.value && !working.value && !busy.value && !uncertain.value && !polling.value && project.value?.status === 'building' && project.value.live_work?.length) void refresh(); }, 10_000);
function halt() { working.value = false; if (timer) clearInterval(timer); timer = undefined; }
async function load() {
  const token = ++epoch; halt(); loading.value = true; error.value = ''; if (project.value?.node_id !== props.node.id) project.value = null;
  try {
    const [active, projects] = await Promise.all([api.activeBuild(), api.builds({ node_id: props.node.id })]);
    if (disposed || token !== epoch) return;
    if (projects.items[0]) accept(projects.items[0]); else project.value = null;
    otherWork.value = active && active.id !== project.value?.id ? active.node_id : null;
    if (active && active.id === project.value?.id && !runner.pending.value) resume(active.id);
  } catch (cause) { if (!disposed && token === epoch) error.value = worldError(cause); }
  finally { if (!disposed && token === epoch) loading.value = false; }
}
async function refresh() {
  const token = epoch; polling.value = true;
  try {
    const projects = await api.builds({ node_id: props.node.id });
    if (disposed || token !== epoch) return;
    if (projects.items[0]) { accept(projects.items[0]); if (project.value?.status !== 'building') { halt(); emit('changed'); } }
  } catch (cause) { if (!disposed && token === epoch) error.value = worldError(cause); }
  finally { polling.value = false; }
}
async function send(path: string, body: Record<string, unknown> = {}, retry = false) {
  if (busy.value || (!retry && runner.pending.value)) return;
  if (path.endsWith('/heartbeat')) nextHeartbeatAt = performance.now() + 10000;
  const token = epoch; error.value = '';
  const result = retry ? await runner.retry() : await runner.submit(path, body);
  if (disposed || token !== epoch) return;
  if (result) {
    const wasWorking = working.value;
    if (result.build) { accept(api.build(result.build)); if (project.value?.status !== 'building') halt(); }
    if (result.work && typeof result.work === 'object' && 'ended_at' in result.work) {
      if (result.work.ended_at === null && project.value?.status === 'building' && !working.value) resume(project.value.id);
      else if (result.work.ended_at !== null) halt();
    }
    if (path.endsWith('/stop')) halt();
    if (!props.embedded && typeof result.return_node_id === 'number' && result.return_node_id > 0) {
      cancelOpen.value = false;
      await router.push(`/world/nodes/${result.return_node_id}#map`);
    } else if (!props.embedded && result.node) { const node = api.node(result.node); await router.push(`/world/nodes/${node.id}`); }
    if (result.node || project.value?.status !== 'building' || wasWorking !== working.value) emit('changed');
    return result;
  } else {
    halt();
    // Another builder may have completed the shared job just before this heartbeat.
    if (!runner.pending.value && project.value) {
      await refresh();
      if (project.value?.status !== 'building') runner.error.value = '';
    }
  }
}
async function start() {
  if (!project.value) return;
  const id = project.value.id;
  const result = await send(`builds/${id}/start`);
  if (!result || !project.value || project.value.status !== 'building' || disposed) return;
  if (!working.value) resume(id);
}
function resume(id: number) { halt(); working.value = true; nextHeartbeatAt = performance.now() + 10000; timer = setInterval(() => { if (foreground.value && !busy.value && !uncertain.value && performance.now() >= nextHeartbeatAt) void send(`builds/${id}/heartbeat`); }, 10_000); }
async function stop() { if (project.value) await send(`builds/${project.value.id}/stop`); }
function retry() { if (runner.pending.value) void send(runner.pending.value.path, runner.pending.value.body, true); }
function requestCancel() {
  if (!project.value || busy.value || uncertain.value) return;
  if (repairing.value) void send(`builds/${project.value.id}/cancel`);
  else cancelOpen.value = true;
}
async function cancelBuild() {
  if (!project.value || project.value.status !== 'building' || repairing.value || busy.value || uncertain.value) return;
  const result = await send(`builds/${project.value.id}/cancel`);
  if (result) cancelOpen.value = false;
}
watch(() => [props.node.id, props.session, project.value?.id, project.value?.status], () => { cancelOpen.value = false; });
watch([() => props.node.id, () => props.node.status, () => props.session, foreground], (current, previous) => {
  const identityChanged = current.slice(0, 3).some((value, index) => value !== previous?.[index]);
  if (!foreground.value) { if (identityChanged) { epoch++; halt(); project.value = null; loading.value = false; } return; }
  if (identityChanged || !project.value) { void load(); return; }
  if (busy.value || uncertain.value || polling.value || project.value.status !== 'building') return;
  if (working.value) void send(`builds/${project.value.id}/heartbeat`); else void refresh();
}, { immediate: true });
watch(() => props.node.revision, () => { if (foreground.value && project.value && !loading.value && !busy.value && !polling.value) void refresh(); });
onScopeDispose(() => { disposed = true; epoch++; halt(); clearInterval(animation); clearInterval(sync); });
</script>
<template lang="pug">
section.build-information(v-if="resultVisible || !project || project.status === 'building' || error || runner.error.value || uncertain" aria-label="Строительство")
  .build-heading
    h3 {{ repairing ? 'Ремонт' : 'Строительство' }}
    world-help-hint(label="Условия строительных работ")
      p Бюджет помощников: #[world-credits(:value="project?.labor_budget ?? '0'")] . Владелец работает бесплатно.
      p Время учитывается, пока эта страница открыта и есть связь с сервером.
      p После обрыва связи учитывается не больше 60 дополнительных секунд.
  n-alert(closable v-if="error" type="error") {{ error }}
  n-alert(closable v-if="runner.error.value" type="error") {{ runner.error.value }}
  n-button(:theme-overrides="worldActionButtonTheme" v-if="uncertain" :loading="busy" @click="retry") Повторить запрос
  n-spin(v-if="loading && !project" size="small" aria-label="Загрузка строительства")
  template(v-else-if="project && project.status === 'building'")
    n-alert(v-if="otherWork" type="info") Сначала остановите работу на стройке объекта №{{ otherWork }}.
    .build-progress-row
      .build-progress
        p Прочность {{ strength }} / {{ maximum }}
        n-progress(type="line" :percentage="Math.min(100, 100 * seconds / Math.max(1, project.required_seconds))" :show-indicator="false")
      font-awesome-icon.build-sync(icon="spinner" :spin="busy || polling" :class="{ active: busy || polling }" :title="busy || polling ? 'Сверяем прогресс' : 'Прогресс синхронизирован'" aria-label="Синхронизация прогресса")
    .build-actions
      n-button(:theme-overrides="worldActionButtonTheme" v-if="!working" type="primary" :disabled="busy || uncertain || !!otherWork" @click="start")
        template(#icon)
          font-awesome-icon(icon="hammer")
        | {{ repairing ? 'Ремонтировать' : 'Строить' }}
      n-button(:theme-overrides="worldActionButtonTheme" v-else :disabled="busy || uncertain" @click="stop")
        template(#icon)
          font-awesome-icon(icon="pause")
        | Остановить
      n-tooltip(v-if="owner === project.owner_user_id")
        template(#trigger)
          n-button(:theme-overrides="worldActionButtonTheme" circle aria-label="Название и бюджет" :disabled="busy || uncertain" @click="settingsOpen = true")
            template(#icon)
              font-awesome-icon(icon="pencil-alt")
        | Название и бюджет
      n-button(:theme-overrides="worldDangerButtonTheme" type="error" v-if="owner === project.owner_user_id" :disabled="busy || uncertain" @click="requestCancel")
        template(#icon)
          font-awesome-icon(icon="times")
        | {{ repairing ? 'Завершить ремонт досрочно' : 'Отменить' }}
  world-build-results(v-else-if="resultVisible && project" :project="project" @close="dismissResult")
  p(v-else-if="!error && !project") Здесь сейчас нет доступной стройки.
  build-settings-modal(v-model:show="settingsOpen" :project="project" :name="node.name" :owner="owner" :session="session" @saved="refresh(); emit('changed')")
  app-dialog(icon="hammer" v-model:show="cancelOpen" title="Отменить строительство?" :mask-closable="!busy" :close-on-esc="!busy" :closable="!busy" :style="{ width: 'min(32rem, 95vw)' }")
    p Объект будет удалён с карты. 30% ресурсов не будут возвращены, даже если строительство ещё не начиналось.
    p Вернётся 70% каждого материала с округлением вниз до целого количества.
    p Цена объекта не возвращается. Выполненная работа помощников будет оплачена, остаток трудового бюджета освобождён.
    n-alert(closable v-if="runner.error.value" type="error") {{ runner.error.value }}
    .build-actions
      n-button(:theme-overrides="worldActionButtonTheme" :disabled="busy" @click="cancelOpen = false") Продолжить строительство
      n-button(:theme-overrides="worldActionButtonTheme" v-if="uncertain" :loading="busy" @click="retry") Повторить запрос
      n-button(:theme-overrides="worldDangerButtonTheme" type="error" v-else :loading="busy" :disabled="busy" @click="cancelBuild") Отменить
</template>
<style scoped>
.build-heading { display: flex; align-items: start; justify-content: space-between; gap: .5rem; }.build-heading h3 { margin: 0; }
.build-information { display: grid; gap: .75rem; }.build-actions { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }.build-progress-row { display: grid; grid-template-columns: minmax(0, 1fr) 1rem; gap: .5rem; align-items: start; }.build-progress { display: grid; gap: .5rem; }.build-progress p { margin: 0; }.build-sync { opacity: .3; }.build-sync.active { opacity: 1; color: var(--primary); }
</style>

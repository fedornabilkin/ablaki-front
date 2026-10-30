<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton, NInput, NModal, NProgress, NSelect, NSpin } from 'naive-ui';
import { checklistItems, checklistKey, checklistStatus, emptyChecklist, emptyEntry, observeChecklist, readChecklist, saveChecklist, type ChecklistId, type ChecklistResult, type ChecklistRun } from '@/entities/world/checklist';
import { worldActionButtonTheme, worldDangerButtonTheme, worldModalTheme } from '@/entities/world/theme';
import type { MvpState } from '@/services/api/worldMvp';

const props = defineProps<{ owner: number; session: number; snapshot: { state: MvpState | null; loading: boolean; error: string } }>();
const emit = defineEmits<{ refresh: [] }>();
const show = ref(false), confirmClear = ref(false), storageError = ref('');
const run = ref<ChecklistRun>(emptyChecklist());
const key = computed(() => props.owner > 0 && Number.isSafeInteger(props.owner) && props.snapshot.state?.worldInstance ? checklistKey(props.owner, props.snapshot.state.worldInstance) : null);
const groups = [...new Set(checklistItems.map(item => item.group))];
const group = ref<string>(groups[0]), filter = ref<'all' | 'open'>('all');
const filteredItems = computed(() => checklistItems.filter(item => item.group === group.value && (filter.value === 'all' || checklistStatus(run.value.entries[item.id]) !== 'pass')));
const statusLabels = { pending: 'Не проверено', pass: 'Пройдено', fail: 'Ошибка', skip: 'Пропущено' };
const options = [{ value: 'auto', label: 'По данным сервера' }, { value: 'pending', label: 'Не проверено' }, { value: 'pass', label: 'Пройдено вручную' }, { value: 'fail', label: 'Найдена ошибка' }, { value: 'skip', label: 'Пропустить' }];
const counts = computed(() => checklistItems.reduce((value, item) => { value[checklistStatus(run.value.entries[item.id])]++; return value; }, { pending: 0, pass: 0, fail: 0, skip: 0 }));
const percent = computed(() => Math.floor(counts.value.pass * 100 / checklistItems.length));
const automatic = (id: ChecklistId) => { const item = checklistItems.find(item => item.id === id)!; return 'steps' in item || 'special' in item; };
const date = (stamp: number) => new Date(stamp).toLocaleString('ru-RU');
function persist() {
  if (!key.value) return;
  try {
    if (!saveChecklist(window.localStorage, key.value, run.value)) throw new Error('storage');
    storageError.value = '';
  } catch { storageError.value = 'Браузер не сохранил результаты. До закрытия страницы они доступны здесь; скачайте отчёт.'; }
}
function observe() {
  if (!key.value) return;
  const next = observeChecklist(run.value, props.snapshot.state);
  if (next !== run.value) { run.value = next; persist(); }
}
function restore() {
  run.value = emptyChecklist(); storageError.value = ''; confirmClear.value = false;
  if (!key.value) return;
  try { const stored = readChecklist(window.localStorage, key.value); run.value = stored.run; storageError.value = stored.error; }
  catch { storageError.value = 'Хранилище браузера недоступно. Результаты можно скачать в отчёте.'; }
  // A corrupted value is left intact until the user explicitly changes a result.
  if (!storageError.value) observe();
}
function update(id: ChecklistId, change: { result?: ChecklistResult; note?: string }) {
  if (!key.value) return;
  const now = Date.now();
  const fallback = { ...emptyEntry(), result: automatic(id) ? 'auto' as const : 'pending' as const };
  run.value = { ...run.value, updatedAt: now, entries: { ...run.value.entries, [id]: { ...(run.value.entries[id] ?? fallback), ...change, updatedAt: now } } };
  persist();
}
function clear() { run.value = emptyChecklist(); confirmClear.value = false; persist(); observe(); }
function exportReport() {
  const report = { worldInstance: props.snapshot.state?.worldInstance, userId: props.owner, ...run.value,
    results: checklistItems.map(item => ({ id: item.id, title: item.title, status: checklistStatus(run.value.entries[item.id]), ...(run.value.entries[item.id] ?? {}) })) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `world-checklist-${props.owner}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
watch(key, restore, { immediate: true, flush: 'sync' });
watch(() => props.snapshot.state, () => { if (!storageError.value) observe(); });
watch(() => [props.owner, props.session], () => { show.value = false; confirmClear.value = false; });
function sync(event: StorageEvent) { if (key.value && event.key === key.value) restore(); }
onMounted(() => window.addEventListener('storage', sync));
onScopeDispose(() => window.removeEventListener('storage', sync));
</script>
<template lang="pug">
n-button.world-checklist-button(:theme-overrides="worldActionButtonTheme" size="small" title="Чеклист проверки MVP" aria-label="Чеклист проверки MVP" @click="show = true")
  template(#icon)
    font-awesome-icon(icon="clipboard-check" aria-hidden="true")
  | Чеклист
  span.checklist-badge(v-if="key") {{ counts.pass }}/{{ checklistItems.length }}
n-modal(v-model:show="show" :theme-overrides="worldModalTheme" preset="card" title="Проверка MVP" class="world-checklist-modal" :style="{ width: 'min(56rem, calc(100vw - 1.5rem))' }")
  .world-checklist(:aria-busy="snapshot.loading")
    p.checklist-intro Результаты и комментарии сохраняются в этом браузере отдельно для каждого пользователя и нового мира. Подтверждённые этапы отмечаются автоматически; любой результат можно уточнить вручную.
    n-alert(v-if="storageError" type="warning") {{ storageError }}
    n-alert(v-if="snapshot.error" type="warning") {{ snapshot.error }} Сохранённые результаты остаются доступны.
    n-spin(v-if="snapshot.loading && !key" size="small")
    n-alert(v-else-if="!key" type="info") Чеклист появится после загрузки текущего мира. Проверьте доступ к миру и повторите загрузку.
    template(v-if="key")
      .checklist-summary
        strong Пройдено {{ counts.pass }} из {{ checklistItems.length }}
        span Ошибок: {{ counts.fail }} · Не проверено: {{ counts.pending }} · Пропущено: {{ counts.skip }}
      n-progress(type="line" :percentage="percent" :show-indicator="false")
      .checklist-toolbar
        n-button(size="small" :loading="snapshot.loading" :disabled="snapshot.loading" @click="emit('refresh')") Обновить факты
        n-button(size="small" @click="exportReport") Скачать результаты
        n-button(size="small" @click="confirmClear = !confirmClear") Сбросить отметки
      n-alert(v-if="confirmClear" type="warning")
        p Будут удалены только результаты и комментарии этого чеклиста. Подтверждённые сервером этапы отметятся снова.
        n-button(size="small" :theme-overrides="worldDangerButtonTheme" @click="clear") Сбросить
        n-button(size="small" @click="confirmClear = false") Оставить
      .checklist-tabs(role="tablist" aria-label="Группы проверок")
        button(v-for="name in groups" :key="name" type="button" role="tab" :aria-selected="group === name" @click="group = name") {{ name }}
      .checklist-filters(aria-label="Фильтр проверок")
        n-button(size="tiny" :type="filter === 'all' ? 'primary' : 'default'" :aria-pressed="filter === 'all'" @click="filter = 'all'") Все
        n-button(size="tiny" :type="filter === 'open' ? 'primary' : 'default'" :aria-pressed="filter === 'open'" @click="filter = 'open'") Открытые
      section.checklist-group(:aria-label="group")
        p(v-if="!filteredItems.length") Все проверки этой группы пройдены.
        details.checklist-item(v-for="item in filteredItems" :key="item.id" :open="checklistStatus(run.entries[item.id]) !== 'pass'" :class="`result-${checklistStatus(run.entries[item.id])}`")
          summary.checklist-item-heading
            strong {{ item.title }}
            span.checklist-status {{ statusLabels[checklistStatus(run.entries[item.id])] }}
          .checklist-item-body
            p {{ item.detail }}
            .checklist-result
              n-select(size="small" :value="run.entries[item.id]?.result ?? (automatic(item.id) ? 'auto' : 'pending')" :options="automatic(item.id) ? options : options.filter(option => option.value !== 'auto')" :placeholder="'Не проверено'" :aria-label="`Результат: ${item.title}`" @update:value="update(item.id, { result: $event })")
              n-input(size="small" :value="run.entries[item.id]?.note ?? ''" :maxlength="1500" placeholder="Результат или замечание" :aria-label="`Комментарий: ${item.title}`" @update:value="update(item.id, { note: $event })")
            small(v-if="run.entries[item.id]?.autoAt") Сервер подтвердил {{ date(run.entries[item.id]?.autoAt ?? 0) }}
    p.checklist-footer(v-if="key") Начало проверки: {{ date(run.startedAt) }} · {{ storageError ? 'Не сохранено в браузере' : 'Сохраняется автоматически' }}
</template>
<style scoped>
.checklist-badge { margin-left: .45rem; font-size: .7rem; font-variant-numeric: tabular-nums; }
.world-checklist { display: grid; gap: .65rem; max-height: 75vh; overflow-y: auto; padding: .15rem; }
.checklist-intro, .checklist-item p, .checklist-footer, .checklist-result small { color: var(--text-muted); font-size: .8rem; line-height: 1.5; margin: 0; }
.checklist-summary, .checklist-item-heading, .checklist-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: .6rem; }
.checklist-summary span { font-size: .8rem; color: var(--text-muted); }
.checklist-toolbar { justify-content: flex-start; }
.checklist-tabs { display: flex; gap: .25rem; overflow-x: auto; border-bottom: 1px solid var(--border); }.checklist-tabs button { flex-shrink: 0; padding: .5rem .7rem; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--text-muted); cursor: pointer; }.checklist-tabs button[aria-selected="true"] { color: var(--primary); border-color: var(--primary); }.checklist-filters { display: flex; gap: .4rem; }
.checklist-group { display: grid; gap: .45rem; }.checklist-item { padding: .6rem .75rem; border: 1px solid var(--border); border-left: 3px solid var(--border); border-radius: .5rem; background: var(--bg-base); }.checklist-item-heading { cursor: pointer; font-size: .85rem; }.checklist-item-body { display: grid; gap: .5rem; margin-top: .5rem; }.checklist-item-body small { color: var(--text-muted); font-size: .7rem; }
.result-pass { border-left-color: #36ad6a; }.result-fail { border-left-color: #e14c60; }.result-skip { opacity: .75; }
.checklist-status { font-size: .75rem; color: var(--text-muted); }.result-pass .checklist-status { color: #36ad6a; }.result-fail .checklist-status { color: #e14c60; }
.checklist-result { display: grid; grid-template-columns: minmax(8rem, 12rem) minmax(0, 1fr); gap: .5rem; align-items: center; }
@media(max-width: 550px) { .checklist-result { grid-template-columns: minmax(7rem, .8fr) minmax(0, 1fr); }.checklist-item { padding: .5rem; } }
</style>

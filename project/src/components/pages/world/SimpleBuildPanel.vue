<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton, NCard, NInput, NSelect, NProgress } from 'naive-ui';
import * as api from '@/services/api/simpleWorld';
import { worldError } from '@/services/api/world';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { formatCredits } from '@/entities/world/credits';
const props = defineProps<{ node: api.SimpleNode; owner: number; session: number }>();
const emit = defineEmits<{ changed: [] }>();
const router = useRouter(), templates = ref<api.Template[]>([]), project = ref<api.Build | null>(null);
const selected = ref<number | null>(null), name = ref(''), budget = ref('0'), error = ref(''), working = ref(false);
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.${props.node.id}.build`), computed(() => props.session));
const busy = runner.busy, uncertain = computed(() => !!runner.pending.value);
const choice = computed(() => templates.value.find(row => row.id === selected.value));
let epoch = 0, disposed = false, timer: ReturnType<typeof setInterval> | undefined;
function halt() { working.value = false; if (timer) clearInterval(timer); timer = undefined; }
async function load() {
  const token = ++epoch; halt(); error.value = ''; project.value = null; templates.value = [];
  try {
    const [catalog, projects] = await Promise.all([props.node.status === 'active' ? api.templates(props.node.id) : Promise.resolve([]), api.builds({ node_id: props.node.id })]);
    if (disposed || token !== epoch) return;
    templates.value = catalog; selected.value = catalog[0]?.id ?? null; project.value = projects.items[0] ?? null;
  } catch (cause) { if (!disposed && token === epoch) error.value = worldError(cause); }
}
async function send(path: string, body: Record<string, unknown> = {}, retry = false) {
  const token = epoch; error.value = '';
  const result = retry ? await runner.retry() : await runner.submit(path, body);
  if (disposed || token !== epoch) return;
  if (result) {
    if (result.build) { project.value = api.build(result.build); if (project.value.status !== 'building') halt(); }
    if (result.node) { const node = api.node(result.node); await router.push(`/world/nodes/${node.id}`); }
    if (result.node || project.value?.status !== 'building') emit('changed');
    return result;
  } else { halt(); }
}
async function start() {
  if (!project.value) return;
  const id = project.value.id;
  const result = await send(`builds/${id}/start`);
  if (!result || !project.value || project.value.status !== 'building' || disposed) return;
  working.value = true;
  timer = setInterval(() => { if (!busy.value) void send(`builds/${id}/heartbeat`); }, 10_000);
}
async function stop() { halt(); if (project.value) await send(`builds/${project.value.id}/stop`); }
function create() { if (choice.value) void send('builds', { parent_id: props.node.id, template_id: choice.value.id, name: name.value.trim() || choice.value.name, labor_budget: budget.value }); }
function retry() { if (runner.pending.value) void send(runner.pending.value.path, runner.pending.value.body, true); }
watch(() => [props.node.id, props.node.status, props.session], () => { void load(); }, { immediate: true });
onScopeDispose(() => { disposed = true; epoch++; halt(); });
</script>
<template lang="pug">
n-card(title="Строительство")
  n-alert(v-if="error" type="error") {{ error }}
  n-alert(v-if="runner.error.value" type="error") {{ runner.error.value }}
  n-button(v-if="uncertain" :loading="busy" @click="retry") Повторить запрос
  template(v-if="project && project.status === 'building'")
    p {{ project.worked_seconds }} / {{ project.required_seconds }} секунд работы
    n-progress(type="line" :percentage="Math.floor(100 * project.worked_seconds / project.required_seconds)")
    p Бюджет помощников: {{ formatCredits(project.labor_budget) }} Cr. Владелец работает бесплатно.
    p Время учитывается, пока эта страница открыта и есть связь с сервером.
    p После обрыва связи учитывается не больше 60 дополнительных секунд.
    n-button(v-if="!working" :disabled="busy || uncertain" @click="start") Начать работу
    n-button(v-else :disabled="busy" @click="stop") Остановиться
    n-button(v-if="owner === project.owner_user_id" :disabled="busy || uncertain" @click="send(`builds/${project.id}/cancel`)") Отменить стройку
  template(v-else-if="node.status === 'active' && owner === node.owner_user_id && templates.length")
    n-select(v-model:value="selected" :options="templates.map(row => ({ label: row.name, value: row.id }))" aria-label="Тип постройки")
    n-input(v-model:value="name" placeholder="Название (можно оставить пустым)" :maxlength="120")
    p(v-if="choice") Трудоёмкость: {{ choice.build_seconds }} секунд. Материалы: {{ choice.material_summary || 'не нужны' }}.
    label Бюджет помощников, Cr (0 — строить самому)
    n-input(v-model:value="budget" placeholder="0" :input-props="{ inputmode: 'decimal' }")
    p Оплата идёт из бюджета этого объекта по доле выполненной работы. Неиспользованные средства остаются в бюджете.
    n-button(type="primary" :disabled="busy || uncertain" @click="create") Начать строительство
  p(v-else-if="!project || project.status !== 'building'") Здесь сейчас нет доступной стройки.
</template>

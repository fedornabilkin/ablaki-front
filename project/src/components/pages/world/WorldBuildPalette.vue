<script setup lang="ts">
import { worldActionButtonTheme } from '@/entities/world/theme';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton, NSkeleton } from 'naive-ui';
import { useRouter } from 'vue-router';
import WorldHelpHint from './WorldHelpHint.vue';
import { useWorldBudget } from '@/hooks/useWorldBudget';
import BuildSettingsModal from './modals/BuildSettingsModal.vue';
import type { WorldNode, WorldMapData } from '@/entities/world/types';
import type { MapPoint } from '@/entities/world/coordinates';
import { selectedFreeCell } from '@/entities/world/placement';
import { templates, build, type Template, type Build } from '@/services/api/simpleWorld';
import { worldError } from '@/services/api/world';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { useCampsiteCraft } from '@/hooks/useCampsiteCraft';
import { formatDuration } from '@/entities/world/duration';
import { creditCost } from '@/entities/world/credits';
const props = defineProps<{ node: WorldNode; map: WorldMapData | null; selection: MapPoint[]; owner: number; session: number; revision: number; writable: boolean }>();
const emit = defineEmits<{ changed: [] }>();
const choices = ref<Template[]>([]), project = ref<Build | null>(null), open = ref(false), error = ref(''), loading = ref(false), name = ref('');
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.${props.node.id}.placement`), computed(() => props.session));
const router = useRouter(), chosen = ref<Template | null>(null), position = ref<MapPoint | null>(null);
const { available: budgetAvailable, error: budgetError, refresh: refreshBudget } = useWorldBudget(computed(() => props.node.owned_by_me ? props.node.id : null), computed(() => props.session), computed(() => props.revision));
const draft = computed(() => chosen.value ? { price: chosen.value.economy?.price_cr ?? '0', budgetAvailable: budgetAvailable.value } : undefined);
const cell = computed(() => selectedFreeCell(props.selection, props.map));
const craftHref = useCampsiteCraft(computed(() => props.session), computed(() => props.node));
const missingResources = computed(() => choices.value.some(item => item.available === false));
const blocked = computed(() => !props.writable || !props.node.owned_by_me || props.node.status !== 'active' || loading.value || runner.busy.value || !!runner.pending.value);
let generation = 0;
watch(() => [props.node.id, props.session, props.revision], async () => {
  const current = ++generation; error.value = ''; loading.value = true;
  try { const result = await templates(props.node.id); if (current === generation) choices.value = result; }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) loading.value = false; }
}, { immediate: true });
watch([() => props.node.id, () => props.session], () => { choices.value = []; open.value = false; project.value = null; chosen.value = null; position.value = null; }, { flush: 'sync' });
function icon(item: Template) { return ({ PLOT: 'seedling', BED: 'seedling', CHEST: 'box', PLACE: 'cube', ROOM: 'house' } as Record<string, string>)[item.kind ?? ''] ?? 'house'; }
function reason(item: Template) { return !props.node.owned_by_me ? 'Требуются права владельца.' : props.node.status !== 'active' ? 'Сначала завершите строительство.' : !cell.value ? 'Выберите одну свободную открытую ячейку.' : item.unavailable_reason || 'Ресурсы и оборудование доступны.'; }
function accept(result: Record<string, unknown> | undefined) {
  if (!result?.build) return;
  project.value = build(result.build);
  open.value = false;
  emit('changed');
  void router.push(`/world/nodes/${project.value.node_id}#map`);
}
function choose(item: Template) {
  if (blocked.value || !cell.value || item.available !== true) return;
  chosen.value = item; position.value = { ...cell.value };
  project.value = null; name.value = item.name; open.value = true;
}
async function create(settings: { name: string; labor_budget: string; top_up: boolean }, retryRequest = false) {
  if (!chosen.value || !position.value) return;
  const current = generation, item = chosen.value;
  const result = retryRequest ? await runner.retry() : await runner.submit('builds', { parent_id: props.node.id, template_id: item.id, ...settings, x: position.value.x, y: position.value.y,
    ...(item.economy ? { terms_digest: item.economy.terms_digest } : {}) });
  if (current === generation) accept(result);
}
async function retry() { const current = generation; const result = await runner.retry(); if (current === generation) accept(result); }
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
section.build-palette(v-if="loading || choices.length || error" aria-label="Доступные объекты")
  .palette-heading
    h3 Можно построить здесь
    world-help-hint(label="Как начать строительство")
      p Выберите свободную открытую ячейку на карте, затем объект.
      p Цена списывается из бюджета текущего объекта. При нехватке кредитов можно добавить разницу с личного баланса. Материалы нужны отдельно; труд владельца бесплатный.
      p Бюджет труда позволяет оплачивать помощь других игроков. Название и бюджет можно изменить позднее.
      router-link(v-if="missingResources" :to="craftHref") Открыть крафт для недостающих ресурсов
  n-alert(v-if="error || runner.error.value" type="error") {{ error || runner.error.value }}
  n-button(:theme-overrides="worldActionButtonTheme" v-if="runner.pending.value && !runner.busy.value" @click="retry") Повторить запрос
  .build-tiles(v-if="loading && !choices.length" role="status" aria-label="Загрузка плиток")
    n-skeleton(v-for="index in 6" :key="index" height="120px" :sharp="false")
  .build-tiles(v-else)
    .build-tile-wrap(v-for="item in choices" :key="item.id")
      .tile-information
        world-help-hint(:label="`Описание: ${item.name}`" symbol="i")
          p {{ item.description || item.name }}
          p {{ reason(item) }}
          p Трудоёмкость: {{ formatDuration(item.build_seconds) }} реального времени работы. Владелец работает бесплатно; помощникам выделяется отдельный бюджет.
      button.build-tile(type="button" :disabled="blocked || !cell || item.available !== true" @click="choose(item)")
        font-awesome-icon(:icon="icon(item)" aria-hidden="true")
        strong {{ item.name }}
        small {{ item.material_summary || 'Материалы не нужны' }}
        .build-costs
          span(v-if="item.economy && creditCost(item.economy.price_cr)") {{ creditCost(item.economy.price_cr).slice(3) }}
          span.build-duration
            font-awesome-icon(icon="clock" aria-hidden="true")
            |  {{ formatDuration(item.build_seconds) }}
  build-settings-modal(v-model:show="open" :project="project" :name="name" :owner="owner" :session="session" :draft="draft" :budget-error="budgetError" :creating="runner.busy.value" :creation-error="runner.error.value" :creation-pending="!!runner.pending.value" @refresh-budget="refreshBudget" @create="create" @saved="emit('changed')")
</template>
<style scoped>
.build-tile:not(:disabled) { border-color: var(--primary); background: var(--primary-soft); }
.build-tile-wrap { position: relative; }.tile-information { position: absolute; right: .4rem; top: .4rem; z-index: 1; }.build-costs { display: flex; align-items: center; gap: .65rem; flex-wrap: wrap; }.build-tile > strong { padding-right: 1.3rem; }
.palette-heading { display: flex; align-items: start; justify-content: space-between; gap: .5rem; margin-bottom: .75rem; }.palette-heading h3 { margin: 0; }.build-tile .build-duration svg { font-size: .8rem; }
.build-palette { margin-top: 1rem; }.build-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: .6rem; }.build-tile-wrap { display: grid; }.build-tile { display: grid; gap: .4rem; padding: .85rem; border: 1px solid var(--border); border-radius: .6rem; color: var(--text); background: var(--bg-surface); text-align: left; cursor: pointer; width: 100%; }.build-tile:hover { border-color: var(--primary); }.build-tile:disabled { opacity: .55; cursor: default; }.build-tile svg { color: var(--primary); font-size: 1.4rem; }.build-tile small, .build-tile span { color: var(--text-muted); font-size: .8rem; }
</style>

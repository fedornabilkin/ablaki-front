<script setup lang="ts">
import { worldActionButtonTheme } from '@/entities/world/theme';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton, NTooltip, NSkeleton, NCheckbox } from 'naive-ui';
import BuildSettingsModal from './modals/BuildSettingsModal.vue';
import type { WorldNode, WorldMapData } from '@/entities/world/types';
import type { MapPoint } from '@/entities/world/coordinates';
import { selectedFreeCell } from '@/entities/world/placement';
import { templates, build, type Template, type Build } from '@/services/api/simpleWorld';
import { worldError } from '@/services/api/world';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { useCampsiteCraft } from '@/hooks/useCampsiteCraft';
import { formatDuration } from '@/entities/world/duration';
import { formatCredits } from '@/entities/world/credits';
const props = defineProps<{ node: WorldNode; map: WorldMapData | null; selection: MapPoint[]; owner: number; session: number; revision: number; writable: boolean }>();
const emit = defineEmits<{ changed: [] }>();
const choices = ref<Template[]>([]), project = ref<Build | null>(null), open = ref(false), error = ref(''), loading = ref(false), name = ref('');
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.${props.node.id}.placement`), computed(() => props.session));
const cell = computed(() => selectedFreeCell(props.selection, props.map));
const craftHref = useCampsiteCraft(computed(() => props.session), computed(() => props.node));
const missingResources = computed(() => choices.value.some(item => item.available === false));
const personalContribution = ref(false);
const blocked = computed(() => !props.writable || !props.node.owned_by_me || props.node.status !== 'active' || loading.value || runner.busy.value || !!runner.pending.value);
let generation = 0;
watch(() => [props.node.id, props.session, props.revision], async () => {
  const current = ++generation; error.value = ''; loading.value = true;
  try { const result = await templates(props.node.id); if (current === generation) choices.value = result; }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) loading.value = false; }
}, { immediate: true });
watch([() => props.node.id, () => props.session], () => { choices.value = []; open.value = false; project.value = null; }, { flush: 'sync' });
function icon(item: Template) { return ({ PLOT: 'seedling', BED: 'seedling', CHEST: 'box', PLACE: 'cube', ROOM: 'house' } as Record<string, string>)[item.kind ?? ''] ?? 'house'; }
function reason(item: Template) { return !props.node.owned_by_me ? 'Требуются права владельца.' : props.node.status !== 'active' ? 'Сначала завершите строительство.' : !cell.value ? 'Выберите одну свободную открытую ячейку.' : item.unavailable_reason || 'Ресурсы и оборудование доступны.'; }
function accept(result: Record<string, unknown> | undefined, settings = false) {
  if (!result?.build) return;
  project.value = build(result.build);
  if (settings) open.value = false;
  else { name.value = typeof result.node === 'object' && result.node !== null && 'name' in result.node && typeof result.node.name === 'string' ? result.node.name : ''; open.value = true; }
  emit('changed');
}
async function choose(item: Template) {
  if (blocked.value || !cell.value || item.available !== true) return;
  const current = generation;
  project.value = null; name.value = item.name; open.value = true;
  const result = await runner.submit('builds', { parent_id: props.node.id, template_id: item.id, name: item.name, labor_budget: '0', x: cell.value.x, y: cell.value.y,
    ...(item.economy ? { terms_digest: item.economy.terms_digest, top_up: personalContribution.value } : {}) });
  if (current === generation) accept(result);
}
async function retry() { const current = generation, settings = runner.pending.value?.path.endsWith('/settings'); const result = await runner.retry(); if (current === generation) accept(result, settings); }
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
section.build-palette(v-if="loading || choices.length || error" aria-label="Доступные объекты")
  h3 Можно построить здесь
  p(v-if="!cell") Выберите свободную открытую ячейку на карте.
  template(v-if="choices.some(item => item.economy)")
    p Цена списывается из бюджета текущего объекта. Материалы нужны отдельно; труд владельца бесплатный. Бюджет помощников задаётся отдельно после создания.
    n-checkbox(v-model:checked="personalContribution" :disabled="blocked") Внести недостающую сумму из личных кредитов
  p(v-if="missingResources")
    router-link(:to="craftHref") Не хватает ресурсов? Открыть крафт →
  n-alert(v-if="error || runner.error.value" type="error") {{ error || runner.error.value }}
  n-button(:theme-overrides="worldActionButtonTheme" v-if="runner.pending.value && !runner.busy.value" @click="retry") Повторить запрос
  .build-tiles(v-if="loading && !choices.length" role="status" aria-label="Загрузка плиток")
    n-skeleton(v-for="index in 6" :key="index" height="120px" :sharp="false")
  .build-tiles(v-else)
    n-tooltip(v-for="item in choices" :key="item.id")
      template(#trigger)
        span.build-tile-wrap
          button.build-tile(type="button" :disabled="blocked || !cell || item.available !== true" @click="choose(item)")
            font-awesome-icon(:icon="icon(item)" aria-hidden="true")
            strong {{ item.name }}
            small {{ item.material_summary || 'Материалы не нужны' }}
            span(v-if="item.economy") {{ formatCredits(item.economy.price_cr) }} Cr · {{ formatDuration(item.build_seconds) }} реального труда
            span(v-else) {{ formatDuration(item.world_build_seconds ?? item.build_seconds) }} мира
      | {{ reason(item) }}
  build-settings-modal(v-model:show="open" :project="project" :name="name" :owner="owner" :session="session" :creating="runner.busy.value" :creation-error="runner.error.value" navigate @saved="emit('changed')")
</template>
<style scoped>
.build-tile:not(:disabled) { border-color: var(--primary); background: var(--primary-soft); }
.build-palette { margin-top: 1rem; }.build-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: .6rem; }.build-tile-wrap { display: grid; }.build-tile { display: grid; gap: .4rem; padding: .85rem; border: 1px solid var(--border); border-radius: .6rem; color: var(--text); background: var(--bg-surface); text-align: left; cursor: pointer; width: 100%; }.build-tile:hover { border-color: var(--primary); }.build-tile:disabled { opacity: .55; cursor: default; }.build-tile svg { color: var(--primary); font-size: 1.4rem; }.build-tile small, .build-tile span { color: var(--text-muted); font-size: .8rem; }
</style>

<script setup lang="ts">
import WorldWorkspaceNav from './WorldWorkspaceNav.vue';
import { worldActionButtonTheme } from '@/entities/world/theme';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter, type RouteLocationNormalized } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NSpin } from 'naive-ui';
import { useWorldCommand } from '@/hooks/useWorldCommand';
import { useWorldStore } from '@/store/world';
import { nodeLabels, type NodeType } from '@/entities/world/types';
import { nodeFeatures, tabForHash, tabLabels, tabsForNode, type NodeTab } from '@/entities/world/nodeLayout';
import WorldNodeExtensions from './WorldNodeExtensions.vue';
import WorldMap from './WorldMap.vue';
import WorldNodeStatistics from './WorldNodeStatistics.vue';
import WorldManagement from './WorldManagement.vue';
import WorldStartPanel from './WorldStartPanel.vue';
import WorldMvpProgress from './WorldMvpProgress.vue';
import WorldStoragePanel from './WorldStoragePanel.vue';
import WorldEconomyPanel from './WorldEconomyPanel.vue';
import WorldFinancePolicy from './WorldFinancePolicy.vue';
import WorldBuildPanel from './WorldBuildPanel.vue';
import WorldRepairPanel from './WorldRepairPanel.vue';
import SimpleBudgetPanel from './SimpleBudgetPanel.vue';
import WorldPlacementPalette from './WorldPlacementPalette.vue';
import WorldHeroFinances from './WorldHeroFinances.vue';
import WorldBuildPalette from './WorldBuildPalette.vue';
import { activeBuild, type Build } from '@/services/api/simpleWorld';
import { worldError } from '@/services/api/world';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { useCampsiteCraft } from '@/hooks/useCampsiteCraft';

const route = useRoute(), router = useRouter(), auth = useStore(), world = useWorldStore();
const nodeId = computed(() => route.params.id === undefined ? null : Number(route.params.id));
const invalidId = computed(() => nodeId.value !== null && (!Number.isSafeInteger(nodeId.value) || nodeId.value < 1 || nodeId.value > 2147483647));
const session = computed(() => Number(auth.state.auth.revision));
const owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0));
const mapSelection = ref<{ x: number; y: number }[]>([]);
const purchasedRoom = ref<number | null>(null);
const activeWork = ref<Build | null>(null), workError = ref('');
const pauseRunner = useSimpleWorldCommand(computed(() => `${owner.value}.pause-build`), session);
async function refreshActiveWork() {
  const current = session.value;
  try { const result = await activeBuild(); if (current === session.value) activeWork.value = result; }
  catch (cause) { if (current === session.value) workError.value = worldError(cause); }
}
async function checkWork(to: RouteLocationNormalized) {
  if (!owner.value || !world.capabilities?.world_write || to.path === route.path) return true;
  const current = session.value;
  try {
    const active = await activeBuild();
    if (current !== session.value) return true;
    activeWork.value = active;
    if (active && to.path !== `/world/nodes/${active.node_id}`) { workError.value = 'Сначала приостановите строительство, чтобы перейти на другую карту.'; return false; }
    return true;
  } catch (cause) { workError.value = worldError(cause); return !activeWork.value && world.node?.status !== 'constructing'; }
}
async function pauseWork(retry = false) {
  if (!activeWork.value) return;
  const workingNode = activeWork.value.node_id;
  const current = session.value;
  const result = retry ? await pauseRunner.retry() : await pauseRunner.submit(`builds/${activeWork.value.id}/stop`);
  if (result && current === session.value) { activeWork.value = null; workError.value = ''; changed([world.node?.id ?? workingNode]); }
}
onBeforeRouteUpdate(checkWork); onBeforeRouteLeave(checkWork);
watch(session, () => { activeWork.value = null; workError.value = ''; if (owner.value) void refreshActiveWork(); }, { immediate: true });
const command = useWorldCommand(session, owner, result => {
  if (result.room_id) purchasedRoom.value = result.room_id;
  if (result.return_node_id && nodeId.value === result.changed_node_ids[0] && result.changed_node_ids.includes(result.return_node_id)) {
    world.invalidate(result.changed_node_ids);
    void router.push(`/world/nodes/${result.return_node_id}`).catch(() => load());
    void auth.dispatch('auth/fetchData');
  } else changed(result.changed_node_ids);
});
const { busy: commandBusy, pending: pendingCommand, error: commandError } = command;
let homeRedirect: number | null = null;
async function load(preserve = false) {
  homeRedirect = null;
  if (invalidId.value) { world.cancel(); return; }
  const requested = nodeId.value;
  await world.load(requested, preserve);
  if (requested === null && nodeId.value === null && world.node) {
    homeRedirect = world.node.id;
    void router.replace({ path: `/world/nodes/${world.node.id}`, hash: route.hash }).finally(() => { homeRedirect = null; });
  }
}
watch(session, value => { homeRedirect = null; world.setSession(value); }, { immediate: true, flush: 'sync' });
watch([nodeId, session], () => {
  if (homeRedirect !== null && nodeId.value === homeRedirect && world.node?.id === homeRedirect) { homeRedirect = null; return; }
  void load();
}, { immediate: true });
watch([nodeId, session], () => { purchasedRoom.value = null; mapSelection.value = []; }, { flush: 'sync' });
onScopeDispose(() => world.cancel());
// Refresh just the open branch; overlapping loads and late session responses are ignored by the store.
const updates = setInterval(() => {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible' && !world.loading && world.node && !commandBusy.value && !pendingCommand.value) void world.load(world.node.id, true);
}, 30000);
onScopeDispose(() => clearInterval(updates));
function changed(ids: number[]) { world.invalidate(ids, true); void load(true); void refreshActiveWork(); void auth.dispatch('auth/fetchData'); }

const features = computed(() => world.node ? nodeFeatures(world.node, world.capabilities) : null);
const craftHref = useCampsiteCraft(session, computed(() => world.node));
const tabs = computed<NodeTab[]>(() => world.node && features.value ? tabsForNode(world.node, features.value) : ['map']);
const activeTab = computed(() => tabForHash(route.hash, tabs.value));
const visitedTabs = ref<NodeTab[]>(['map']);
watch([nodeId, session], () => { visitedTabs.value = ['map']; }, { flush: 'sync' });
watch(activeTab, tab => { if (!visitedTabs.value.includes(tab)) visitedTabs.value = [...visitedTabs.value, tab]; }, { immediate: true });
const statuses: Record<string, string> = { active: 'Действует', archived: 'Архив', planned: 'Запланирован', constructing: 'Строится', paused: 'Приостановлен', damaged: 'Повреждён', destroyed: 'Разрушен' };
const icons: Record<NodeType, string> = { WORLD: 'sun', REGION: 'mountain', SETTLEMENT: 'city', BUILDING: 'house', ROOM: 'house', PLOT: 'seedling', BED: 'seedling', CHEST: 'box', PLACE: 'cube' };
const nodeIcon = computed(() => world.node ? icons[world.node.type] : 'sun');
const nodeKind = computed(() => world.node ? nodeLabels[world.node.type] : 'Мир');
const parentName = computed(() => world.breadcrumbs.find(node => node.id === world.node?.parent_id)?.label ?? 'Родительский объект');
const detail = computed(() => world.node?.details ?? {});
const detailLabels: Record<string, string> = { climate: 'Климат', settlement_kind: 'Тип поселения', population: 'Жители', plot_limit: 'Лимит участков', building_kind: 'Тип постройки', level: 'Уровень', condition: 'Прочность', max_condition: 'Максимальная прочность', area: 'Площадь', exposure_class: 'Защита', plot_kind: 'Тип участка', fertility: 'Плодородие', allow_building: 'Можно строить', unlocked: 'Открыта', ordinal: 'Номер', harvested_quantity: 'Собрано урожая', operational_status: 'Состояние работы', settings_json: 'Настройки' };
const facts = computed(() => ['condition', 'max_condition', 'area', 'exposure_class'].map(key => ({ key, label: detailLabels[key], value: detail.value[key] ?? '—' })));
const extensionProps = computed(() => ({ node: world.node!, owner: owner.value, session: session.value, revision: world.dataRevision, writable: Boolean(world.capabilities?.world_write), command }));
const summaryValue = computed(() => `${world.node?.coordinates.x ?? 0}, ${world.node?.coordinates.y ?? 0}`);
const summaryLabel = 'Координаты';
const childTitle = 'Объекты внутри';
function tabLink(tab: NodeTab) { return { path: route.path, query: route.query, hash: `#${tab}` }; }
</script>

<template lang="pug">
.container.world-page
  n-alert(v-if="workError" type="warning" role="alert")
    p {{ workError || 'Вы работаете на стройке. Перед переходом на другую карту приостановите работу.' }}
    n-button(:theme-overrides="worldActionButtonTheme" v-if="activeWork" :disabled="pauseRunner.busy.value" :loading="pauseRunner.busy.value" @click="pauseWork(!!pauseRunner.pending.value)") Приостановить строительство
    p(v-if="pauseRunner.error.value") {{ pauseRunner.error.value }}
  n-alert(v-if="commandError" type="error" role="alert") {{ commandError }}
  n-alert(v-if="pendingCommand && !commandBusy" type="info")
    p Ответ на прошлое действие ещё не получен. Можно повторить тот же запрос.
    n-button(:theme-overrides="worldActionButtonTheme" :loading="commandBusy" @click="command.retry") Повторить запрос
  n-alert(v-if="purchasedRoom" type="success")
    p Помещение оплачено. Откройте его, чтобы разместить вещи и назначить ночлег, если в покупке есть койка.
    router-link(:to="`/world/nodes/${purchasedRoom}`") Открыть купленное помещение
  n-alert(v-if="invalidId" type="error") Некорректный адрес объекта.
  n-alert(v-else-if="world.error && !world.node" type="error" role="alert")
    p {{ world.error }}
    router-link(to="/world") Вернуться к карте мира
  n-spin(v-else-if="world.loading && !world.node" size="large" aria-label="Загрузка мира")
  n-alert(v-else-if="!world.capabilities?.world_read" type="info") Мир пока закрыт. Ваши вещи и кредиты доступны в мастерской и профиле.
  n-alert(v-else-if="!world.node" type="info") В этом мире пока нет опубликованных объектов.
  template(v-else)
    n-alert(v-if="world.error" type="error" role="alert") {{ world.error }}
    section.world-hero(:aria-label="nodeKind + ': ' + world.node.label")
      .world-crest(aria-hidden="true")
        font-awesome-icon(:icon="nodeIcon")
      .world-identity
        h1 {{ world.node.label }}
        p.world-description {{ nodeKind }} · №{{ world.node.id }} · {{ statuses[world.node.status] || world.node.status }} · {{ world.node.visibility === 'private' ? 'Личная территория' : 'Открытая территория' }}
        router-link.world-parent(v-if="world.node.parent_id" :to="`/world/nodes/${world.node.parent_id}`")
          font-awesome-icon(icon="arrow-left" aria-hidden="true")
          |  {{ parentName }}
      .world-hero-metrics
        div
          span Объекты
          strong {{ world.node.child_count }}
        div
          span {{ summaryLabel }}
          strong {{ summaryValue }}
        world-hero-finances(:node="world.node" :session="session" :revision="world.dataRevision")
        world-node-extensions(slot="header" v-bind="extensionProps" @changed="changed([world.node.id])")
    nav.world-tabs(role="tablist" aria-label="Разделы объекта")
      router-link.world-tab(v-for="tab in tabs" :key="tab" :to="tabLink(tab)" :class="{ active: activeTab === tab }" role="tab" :aria-selected="activeTab === tab" :aria-current="activeTab === tab ? 'page' : undefined") {{ tabLabels[tab] }}
    section.world-panel.world-map-panel(v-if="tabs.includes('map')" v-show="activeTab === 'map'" aria-label="Карта и объекты")
      .world-panel-heading
        div
          span.world-eyebrow Территория и расположение
          h2 {{ childTitle }}
        span.world-counter {{ world.map?.items.length ?? 0 }} объектов
      .world-children
        world-map(v-model:selection="mapSelection" :node="world.node" :map="world.map" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command" @changed="changed")
          template(#information)
            world-build-panel(v-if="(world.node.status === 'constructing' || world.node.details.repair_active) && world.capabilities?.world_write" :node-id="world.node.id" :revision="world.dataRevision" :session="session" :owner="owner" @changed="changed([world.node.id])")
            world-repair-panel(v-if="!mapSelection.length" :node="world.node" :owner="owner" :session="session" :writable="Boolean(world.capabilities?.world_write)" @changed="changed([world.node.id])")
            world-node-extensions(slot="map" v-bind="extensionProps" @changed="changed([world.node.id])")
          template(#placement)
            world-build-palette(:node="world.node" :map="world.map" :selection="mapSelection" :owner="owner" :session="session" :revision="world.dataRevision" :writable="Boolean(world.capabilities?.world_write)" @changed="changed([world.node.id])")
            world-placement-palette(:writable="Boolean(world.capabilities?.world_write)" :node="world.node" :map="world.map" :selection="mapSelection" :session="session" :revision="world.dataRevision" :command="command")

    world-start-panel.world-content-card(v-show="activeTab === 'map'" :node="world.node" :writable="Boolean(world.capabilities?.world_write)" :owner="owner" :session="session" @changed="changed([world.node.id])")
    world-mvp-progress(v-show="activeTab === 'map'" :owner="owner" :session="session" :revision="world.dataRevision" :writable="Boolean(world.capabilities?.world_write)" @changed="changed([world.node.id])")
    world-node-extensions(v-show="activeTab === 'map'" slot="content" v-bind="extensionProps" @changed="changed([world.node.id])")


    section.world-tab-panel(v-if="visitedTabs.includes('cultivation') && features?.cultivation" v-show="activeTab === 'cultivation'" aria-label="Выращивание")
      world-node-extensions(slot="cultivation" v-bind="extensionProps" @changed="changed([world.node.id])")

    section.world-tab-panel(v-if="visitedTabs.includes('workshop')" v-show="activeTab === 'workshop'" aria-label="Вещи и крафт")
      .world-section-title
        span.world-eyebrow Мастерская и размещение
        h2 Вещи и крафт
      .world-inline-links.world-content-card
        router-link(v-if="features?.storage && world.node.status === 'active'" :to="craftHref") Изготовление в объекте
        p(v-else) Изготовление доступно владельцу действующего объекта.
        world-workspace-nav(:node-id="world.node.owned_by_me && world.node.status === 'active' ? world.node.id : undefined")
      .world-content-grid.world-content-grid--workshop
        world-storage-panel.world-content-card.world-storage-card(v-if="features.storage" :node="world.node" :map="world.map" :node-id="world.node.id" :revision="world.dataRevision" :writable="Boolean(world.capabilities?.world_write)" :command="command" :session="session")
        world-node-extensions(slot="equipment" v-bind="extensionProps" @changed="changed([world.node.id])")

    section.world-tab-panel(v-if="visitedTabs.includes('finance') && features?.finance" v-show="activeTab === 'finance'" aria-label="Бюджет и казна")
      .world-section-title
        span.world-eyebrow Экономика территории
        h2 Бюджет и казна
      simple-budget-panel.world-content-card(v-if="world.node.owned_by_me && world.node.status === 'active'" :node-id="world.node.id" :owner="owner" :session="session" @changed="changed([world.node.id])")
      world-economy-panel(v-if="world.node.permissions.manage" :node-id="world.node.id" :children="world.map?.items ?? []" :session="session" :command="command")
      p(v-else) Финансовые данные доступны владельцу объекта.

    section.world-tab-panel(v-if="visitedTabs.includes('statistics')" v-show="activeTab === 'statistics'" aria-label="Статистика объекта")
      .world-section-title
        span.world-eyebrow {{ world.node.label }} в цифрах
        h2 Статистика
      .world-stat-grid
        .world-stat-card
          span Статус
          strong {{ statuses[world.node.status] || world.node.status }}
        .world-stat-card
          span Прямые дочерние объекты
          strong {{ world.node.child_count }}
        .world-stat-card(v-for="fact in facts" :key="fact.key")
          span {{ fact.label }}
          strong {{ fact.value }}
      world-node-statistics.world-content-card(:node="world.node" :session="session")

    section.world-tab-panel(v-if="visitedTabs.includes('manage') && world.node.permissions.administer" v-show="activeTab === 'manage'" aria-label="Управление объектом")
      .world-section-title
        span.world-eyebrow Параметры владения
        h2 Управление
      .world-content-grid.world-content-grid--management
        dl.world-facts.world-management-facts.world-content-card
          dt Объект
          dd {{ world.node.label }} · №{{ world.node.id }}
          dt Статус
          dd {{ statuses[world.node.status] || world.node.status }}
          dt Доступ
          dd {{ world.node.visibility === 'private' ? 'Личный' : 'Открытый' }}
          dt Координаты
          dd {{ world.node.coordinates.x }}, {{ world.node.coordinates.y }}
          template(v-for="fact in facts" :key="fact.key")
            dt {{ fact.label }}
            dd {{ fact.value }}
        world-finance-policy.world-content-card(v-if="features?.finance" :node-id="world.node.id" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command")
        world-management.world-content-card(:node="world.node" :writable="Boolean(world.capabilities?.world_write)" :command="command" :session="session")
</template>

<style scoped>
.world-parent { display: inline-flex; margin: .35rem 0 .6rem; padding: .35rem .7rem; width: fit-content; border: 1px solid var(--border); border-radius: .45rem; font-size: .85rem; }
.world-page { display: grid; gap: 1rem; padding-block: 1.5rem 3rem; max-width: 1320px; }
.world-toolbar, .world-inline-links, .world-siblings { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; }
.world-toolbar { justify-content: flex-end; font-size: .9rem; }
.world-hero { display: flex; align-items: start; gap: 1rem; padding: 1rem; border: 1px solid var(--border); border-radius: .8rem; background: radial-gradient(circle at 80% 12%, var(--primary-soft), transparent 45%), var(--bg-surface); }
.world-crest { display: grid; place-items: center; flex: 0 0 4.5rem; height: 4.5rem; border: 1px solid var(--primary); border-radius: .85rem; background: var(--primary-soft); color: var(--primary); font-size: 2rem; }
.world-identity { min-width: 0; flex: 1; }
.world-identity h1 { margin: .25rem 0; font-size: clamp(1.6rem, 3vw, 2.4rem); line-height: 1.15; }
.world-identity p { margin: 0; color: var(--text-muted); }
.world-eyebrow { color: var(--primary); font-size: .72rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.world-hero-metrics { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.world-hero-metrics > div:not(.hero-finances):not(.world-hero-gather):not(.world-node-extensions) { display: grid; gap: .2rem; min-width: 5rem; }
.world-hero-metrics span, .world-stat-card span { color: var(--text-muted); font-size: .8rem; }
.world-hero-metrics strong { font-size: 1rem; overflow-wrap: anywhere; }
.world-tabs { display: flex; gap: .35rem; overflow-x: auto; padding: .4rem; border: 1px solid var(--border); border-radius: .8rem; background: var(--bg-base); scrollbar-width: thin; }
.world-tab { display: inline-flex; align-items: center; flex: 0 0 auto; min-height: 2.6rem; padding: .65rem 1rem; border: 1px solid transparent; border-radius: .6rem; color: var(--text-muted); font-weight: 650; white-space: nowrap; transition: color .15s ease, background-color .15s ease, border-color .15s ease; }
.world-tab:hover { color: var(--text); background: var(--bg-surface); }
.world-tab.active { color: var(--primary); border-color: var(--primary); background: var(--primary-soft); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary) 15%, transparent); }
.world-tab:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.world-tab-panel { display: grid; gap: 1.15rem; min-width: 0; padding: clamp(1rem, 2.5vw, 1.5rem); border: 1px solid var(--border); border-radius: .9rem; background: var(--bg-base); }
.world-overview-grid { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(16rem, .8fr); gap: 1rem; align-items: start; }
.world-panel, .world-stat-card { min-width: 0; padding: 1.25rem; border: 1px solid var(--border); border-radius: .75rem; background: var(--bg-surface); }
.world-content-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 27rem), 1fr)); align-items: start; gap: .9rem; min-width: 0; }
.world-content-grid > * { min-width: 0; }
.world-content-card { min-width: 0; padding: 1.1rem; border: 1px solid var(--border); border-radius: .75rem; background: var(--bg-surface); box-shadow: 0 5px 18px rgba(0, 0, 0, .12); }
.world-storage-card { grid-column: 1 / -1; }
.world-related-link { display: flex; align-items: center; justify-content: space-between; min-height: 4rem; color: var(--primary); font-weight: 650; }
.world-panel-heading { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: start; gap: 1rem; }
.world-panel-heading h2, .world-section-title h2 { margin: .25rem 0 0; }
.world-counter { color: var(--text-muted); font-size: .85rem; }
.world-children, .world-side, .world-action-links { display: grid; gap: 1rem; }
.world-children { margin-top: 1rem; }
.world-action-links { gap: 0; }
.world-action-links a { display: flex; justify-content: space-between; gap: 1rem; padding: .75rem 0; border-bottom: 1px solid var(--border); }
.world-action-links p { color: var(--text-muted); }
.world-facts { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .6rem 1rem; margin: .75rem 0 1rem; }
.world-facts dt { color: var(--text-muted); }
.world-facts dd { margin: 0; text-align: right; overflow-wrap: anywhere; }
.world-siblings { padding: .75rem 0; border-top: 1px solid var(--border); }
.world-section-title { margin-bottom: .5rem; }
.world-inline-links { padding: 1rem; border: 1px solid var(--border); border-radius: .6rem; }
.world-home-links { padding: .4rem 0; border: 0; font-size: .85rem; }
.world-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: .75rem; }
.world-stat-card { display: grid; gap: .35rem; }
.world-stat-card strong { font-size: 1.2rem; overflow-wrap: anywhere; white-space: pre-wrap; }
.world-management-facts { margin: 0; }
@media (max-width: 620px) {
  .world-tab-panel { padding: .85rem; gap: .9rem; }
  .world-tabs { margin-inline: -.25rem; }
  .world-tab { min-height: 2.4rem; padding-inline: .75rem; }
  .world-content-card { padding: .9rem; }
  .world-storage-card { grid-column: auto; }
}
@media (max-width: 900px) { .world-hero { flex-wrap: wrap; } .world-hero-metrics { width: 100%; padding-top: 1rem; border-top: 1px solid var(--border); } .world-overview-grid { grid-template-columns: 1fr; } }
@media (max-width: 540px) { .world-crest { flex-basis: 3.5rem; height: 3.5rem; font-size: 1.5rem; } .world-hero-metrics { justify-content: space-between; gap: .75rem; } .world-tab { padding-inline: .75rem; } }
</style>

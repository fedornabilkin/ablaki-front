<script setup lang="ts">
import SectionNav from '@/components/SectionNav.vue';
import UserAvatar from '@/components/user/UserAvatar.vue';
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
import WorldStartPanel from './WorldStartPanel.vue';
import WorldStoragePanel from './WorldStoragePanel.vue';
import WorldEconomyPanel from './WorldEconomyPanel.vue';
import WorldFinancePolicy from './WorldFinancePolicy.vue';
import WorldBuildPanel from './WorldBuildPanel.vue';
import WorldRepairPanel from './WorldRepairPanel.vue';
import WorldPlacementPalette from './WorldPlacementPalette.vue';
import WorldPageActions from './WorldPageActions.vue';
import WorldHelpHint from './WorldHelpHint.vue';
import WorldBuildPalette from './WorldBuildPalette.vue';
import { activeBuild, type Build } from '@/services/api/simpleWorld';
import { worldError } from '@/services/api/world';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';

const route = useRoute(), router = useRouter(), auth = useStore(), world = useWorldStore();
const nodeId = computed(() => route.params.id === undefined ? null : Number(route.params.id));
const invalidId = computed(() => nodeId.value !== null && (!Number.isSafeInteger(nodeId.value) || nodeId.value < 1 || nodeId.value > 2147483647));
const session = computed(() => Number(auth.state.auth.revision));
const owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0));
const mapSelection = ref<{ x: number; y: number }[]>([]);
const placementTab = ref<'objects' | 'items'>('objects'), itemsVisited = ref(false);
watch([nodeId, session], () => { placementTab.value = 'objects'; itemsVisited.value = false; });
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
    if (active && to.path !== `/world/nodes/${active.node_id}` && to.path !== `/world/nodes/${active.parent_id}`) { workError.value = 'Сначала приостановите строительство, чтобы перейти на другую карту.'; return false; }
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
function changed(ids: number[]) { world.invalidate(ids, true); void load(true); void refreshActiveWork(); void auth.dispatch('auth/fetchData'); }

const features = computed(() => world.node ? nodeFeatures(world.node, world.capabilities) : null);
const tabs = computed<NodeTab[]>(() => world.node && features.value ? tabsForNode(world.node, features.value) : ['map']);
const activeTab = computed(() => tabForHash(route.hash, tabs.value));
const visitedTabs = ref<NodeTab[]>(['map']);
watch([nodeId, session], () => { visitedTabs.value = ['map']; }, { flush: 'sync' });
watch(activeTab, tab => { if (!visitedTabs.value.includes(tab)) visitedTabs.value = [...visitedTabs.value, tab]; }, { immediate: true });
const statuses: Record<string, string> = { active: 'Действует', archived: 'Архив', planned: 'Запланирован', constructing: 'Строится', paused: 'Приостановлен', damaged: 'Повреждён', destroyed: 'Разрушен' };
const statusIcons: Record<string, string> = { active: 'check-circle', archived: 'box', planned: 'clock', constructing: 'hammer', paused: 'pause', damaged: 'exclamation-circle', destroyed: 'times-circle' };
const icons: Record<NodeType, string> = { WORLD: 'globe', REGION: 'mountain', SETTLEMENT: 'city', BUILDING: 'house', ROOM: 'house', PLOT: 'seedling', BED: 'seedling', CHEST: 'box', PLACE: 'cube' };
const nodeIcon = computed(() => world.node ? icons[world.node.type] : 'globe');
const nodeKind = computed(() => world.node ? nodeLabels[world.node.type] : 'Мир');
const parentName = computed(() => world.breadcrumbs.find(node => node.id === world.node?.parent_id)?.label ?? 'Родительский объект');
const detail = computed(() => world.node?.details ?? {});
const detailLabels: Record<string, string> = { climate: 'Климат', settlement_kind: 'Тип поселения', population: 'Жители', plot_limit: 'Лимит участков', building_kind: 'Тип постройки', level: 'Уровень', condition: 'Прочность', max_condition: 'Максимальная прочность', area: 'Площадь', exposure_class: 'Защита', plot_kind: 'Тип участка', fertility: 'Плодородие', allow_building: 'Можно строить', unlocked: 'Открыта', ordinal: 'Номер', harvested_quantity: 'Собрано урожая', operational_status: 'Состояние работы', settings_json: 'Настройки' };
const facts = computed(() => ['condition', 'max_condition', 'area', 'exposure_class'].map(key => ({ key, label: detailLabels[key], value: detail.value[key] ?? '—' })));
const extensionProps = computed(() => ({ node: world.node!, owner: owner.value, session: session.value, revision: world.dataRevision, writable: Boolean(world.capabilities?.world_write), command }));
function tabLink(tab: NodeTab) { return { path: route.path, query: route.query, hash: `#${tab}` }; }
</script>

<template lang="pug">
.container.world-page
  n-alert(closable v-if="workError" type="warning" role="alert")
    p {{ workError || 'Вы работаете на стройке. Перед переходом на другую карту приостановите работу.' }}
    n-button(:theme-overrides="worldActionButtonTheme" v-if="activeWork" :disabled="pauseRunner.busy.value" :loading="pauseRunner.busy.value" @click="pauseWork(!!pauseRunner.pending.value)") Остановить строительство
    p(v-if="pauseRunner.error.value") {{ pauseRunner.error.value }}
  n-alert(closable v-if="commandError" type="error" role="alert") {{ commandError }}
  n-alert(closable v-if="pendingCommand && !commandBusy" type="info")
    p Ответ на прошлое действие ещё не получен. Можно повторить тот же запрос.
    n-button(:theme-overrides="worldActionButtonTheme" :loading="commandBusy" @click="command.retry") Повторить запрос
  n-alert(closable v-if="purchasedRoom" type="success")
    p Помещение оплачено. Откройте его, чтобы разместить вещи и назначить ночлег, если в покупке есть койка.
    router-link(:to="`/world/nodes/${purchasedRoom}`") Открыть купленное помещение
  n-alert(closable v-if="invalidId" type="error") Некорректный адрес объекта.
  n-alert(closable v-else-if="world.error && !world.node" type="error" role="alert")
    p {{ world.error }}
    template(v-if="world.closedTest")
      p Можно сообщить на форуме о желании принять участие в тестировании.
      router-link(to="/forum") Участие в тестировании →
    router-link(to="/world") Вернуться к карте мира
  n-spin(v-else-if="world.loading && !world.node" size="large" aria-label="Загрузка мира")
  n-alert(closable v-else-if="!world.capabilities?.world_read" type="info")
    p Мир пока закрыт. Ваши вещи и кредиты доступны в мастерской и профиле.
    p Можно сообщить на форуме о желании принять участие в тестировании.
    router-link(to="/forum") Участие в тестировании →
  n-alert(closable v-else-if="!world.node" type="info") В этом мире пока нет опубликованных объектов.
  template(v-else)
    n-alert(closable v-if="world.error" type="error" role="alert") {{ world.error }}
    section.world-hero(:aria-label="nodeKind + ': ' + world.node.label")
      .world-crest(aria-hidden="true")
        font-awesome-icon(:icon="nodeIcon")
      .world-identity
        h1 {{ world.node.label }}
        p.world-description
          router-link.world-parent(v-if="world.node.parent_id" :to="`/world/nodes/${world.node.parent_id}`")
            font-awesome-icon(icon="arrow-left" aria-hidden="true")
            span {{ parentName }}
          span {{ nodeKind }} · №{{ world.node.id }}
          font-awesome-icon(:icon="statusIcons[world.node.status] || 'question-circle'" :title="statuses[world.node.status] || world.node.status" :aria-label="statuses[world.node.status] || world.node.status")
          font-awesome-icon(:icon="world.node.visibility === 'private' ? 'lock' : 'globe'" :title="world.node.visibility === 'private' ? 'Личная территория' : 'Открытая территория'")
          font-awesome-icon(v-if="world.node.details.is_lodging" icon="bed" title="Ваш ночлег" aria-label="Ваш ночлег")
      .world-hero-metrics
        world-page-actions(:node="world.node")
        world-node-extensions(slot="header" v-bind="extensionProps" @changed="changed([world.node.id])")
    world-start-panel.world-content-card(:node="world.node" :writable="Boolean(world.capabilities?.world_write)" :owner="owner" :session="session" :revision="world.dataRevision" @changed="changed([world.node.id])")
    .world-object-tabs
      section-nav(label="Разделы объекта" connected :items="tabs.map(tab => ({ to: tabLink(tab), label: tabLabels[tab], icon: ({ map: 'map', cultivation: 'seedling', workshop: 'hammer', finance: 'coins' })[tab], active: activeTab === tab }))")
      section.world-panel.world-map-panel(v-if="tabs.includes('map')" v-show="activeTab === 'map'" aria-label="Карта и объекты")
        .world-panel-heading
          .world-map-heading
            span.world-eyebrow Территория и расположение
            .world-map-owner(v-if="world.node.owner?.user" aria-label="Владелец объекта")
              span.world-owner-label Владелец
              user-avatar(:user="world.node.owner.user" :size="30" :show-rating="false")
          .world-map-tools
            n-button.world-refresh(size="small" :loading="world.loading" :disabled="world.loading || commandBusy || !!pendingCommand" title="Обновить карту и данные объекта" aria-label="Обновить" @click="changed([world.node.id])")
              template(#icon)
                font-awesome-icon(icon="rotate" aria-hidden="true")
              span.world-refresh-label Обновить
            world-help-hint(label="Параметры объекта" symbol="i")
              dl.world-facts
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
        .world-children
          world-map(:active="activeTab === 'map'" :working-node-id="activeWork?.node_id" v-model:selection="mapSelection" :node="world.node" :map="world.map" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command" @changed="changed")
            template(#information)
              world-build-panel(v-if="(world.node.status === 'constructing' || world.node.details.repair_active || world.node.details.last_build_id) && world.capabilities?.world_write" :active="activeTab === 'map'" :node-id="world.node.id" :revision="world.dataRevision" :session="session" :owner="owner" @changed="changed([world.node.id])")
              world-repair-panel(v-if="!mapSelection.length" :node="world.node" :owner="owner" :session="session" :writable="Boolean(world.capabilities?.world_write)" @changed="changed([world.node.id])")
              world-node-extensions(slot="map" :active="activeTab === 'map'" v-bind="extensionProps" @changed="changed([world.node.id])")
            template(#placement)
              .world-placement-tabs(v-if="world.node.owned_by_me")
                .placement-tab-buttons(role="tablist" aria-label="Размещение на карте")
                  button#placement-objects-tab(type="button" role="tab" :aria-selected="placementTab === 'objects'" aria-controls="placement-objects" @click="placementTab = 'objects'")
                    font-awesome-icon(icon="house" aria-hidden="true")
                    |  Объекты
                  button#placement-items-tab(type="button" role="tab" :aria-selected="placementTab === 'items'" aria-controls="placement-items" @click="placementTab = 'items'; itemsVisited = true")
                    font-awesome-icon(icon="cubes" aria-hidden="true")
                    |  Предметы
                #placement-objects(v-show="placementTab === 'objects'" role="tabpanel" aria-labelledby="placement-objects-tab")
                  world-build-palette(:node="world.node" :map="world.map" :selection="mapSelection" :owner="owner" :session="session" :revision="world.dataRevision" :writable="Boolean(world.capabilities?.world_write)" @changed="changed([world.node.id])")
                #placement-items(v-if="itemsVisited" v-show="placementTab === 'items'" role="tabpanel" aria-labelledby="placement-items-tab")
                  world-placement-palette(:writable="Boolean(world.capabilities?.world_write)" :node="world.node" :map="world.map" :selection="mapSelection" :session="session" :revision="world.dataRevision" :command="command")

      world-node-extensions(v-show="activeTab === 'map'" :active="activeTab === 'map'" slot="content" v-bind="extensionProps" @changed="changed([world.node.id])")


      section.world-tab-panel(v-if="visitedTabs.includes('cultivation') && features?.cultivation" v-show="activeTab === 'cultivation'" aria-label="Выращивание")
        world-node-extensions(slot="cultivation" :active="activeTab === 'cultivation'" v-bind="extensionProps" @changed="changed([world.node.id])")

      section.world-tab-panel(v-if="visitedTabs.includes('workshop')" v-show="activeTab === 'workshop'" aria-label="Вещи и крафт")
        .world-section-title
          span.world-eyebrow Мастерская и размещение
          h2 Вещи и крафт
        .world-inline-links.world-content-card
          router-link.world-manufacturing-action(v-if="features?.manufacturing" :to="`/world/workspace/${world.node.id}`")
            font-awesome-icon(icon="hammer" aria-hidden="true")
            | Изготовление в этом объекте
          p(v-else) Изготовление доступно владельцу действующего объекта.
          world-workspace-nav(:node-id="features?.manufacturing ? world.node.id : undefined" :show-manufacturing="false")
        .world-content-grid.world-content-grid--workshop
          world-storage-panel.world-content-card.world-storage-card(v-if="features.storage" :node="world.node" :map="world.map" :node-id="world.node.id" :revision="world.dataRevision" :writable="Boolean(world.capabilities?.world_write)" :command="command" :session="session")
          world-node-extensions(slot="equipment" v-bind="extensionProps" @changed="changed([world.node.id])")

      section.world-tab-panel(v-if="visitedTabs.includes('finance') && features?.finance" v-show="activeTab === 'finance'" aria-label="Бюджет и казна")
        .world-section-title
          span.world-eyebrow Экономика территории
          h2 Бюджет и казна
        world-economy-panel(v-if="world.node.permissions.manage" :node-id="world.node.id" :children="world.map?.items ?? []" :session="session" :command="command")
          world-finance-policy.world-finance-card(v-if="world.node.permissions.administer" :node-id="world.node.id" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command")
        p(v-else) Финансовые данные доступны владельцу объекта.

</template>

<style scoped>
.world-placement-tabs { margin-top: 1rem; }.placement-tab-buttons { display: flex; gap: .4rem; border-bottom: 1px solid var(--border); padding-bottom: .5rem; }.placement-tab-buttons button { border: 1px solid var(--border); border-radius: .5rem; padding: .55rem 1rem; background: var(--bg-surface); color: var(--text-muted); cursor: pointer; }.placement-tab-buttons button[aria-selected="true"] { border-color: var(--primary); background: var(--primary-soft); color: var(--primary); }.placement-tab-buttons button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.world-description { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.world-parent { display: inline-flex; align-items: center; gap: .35rem; margin: 0; padding: .2rem .5rem; max-width: 100%; border: 1px solid var(--border); border-radius: .45rem; font-size: .8rem; line-height: 1.4; }
.world-parent > svg { flex-shrink: 0; }
.world-map-heading { display: flex; flex-wrap: wrap; align-items: center; gap: .65rem 1.25rem; min-width: 0; }
.world-map-owner { display: flex; align-items: center; gap: .6rem; min-width: 0; font-size: .85rem; }
.world-owner-label { color: var(--text-muted); font-size: .75rem; }
.world-map-tools { display: flex; align-items: center; gap: .75rem; }
.world-inline-links .world-manufacturing-action { display: inline-flex; align-items: center; gap: .5rem; padding: .65rem .9rem; border-radius: .5rem; background: var(--primary); color: var(--primary-contrast, #171717); font-weight: 650; }
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
.world-panel-heading { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: .75rem 1rem; }
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
@media (max-width: 620px) {
  .world-page { padding-top: .75rem; gap: .75rem; }
  .world-hero { display: grid; grid-template-columns: 2.75rem minmax(0, 1fr); gap: .65rem; padding: .75rem; }
  .world-crest { height: 2.75rem; font-size: 1.25rem; }
  .world-identity h1 { margin: 0 0 .25rem; font-size: 1.35rem; }
  .world-description { gap: .35rem; font-size: .75rem; }
  .world-parent { padding: .2rem .45rem; font-size: .75rem; }
  .world-panel-heading { display: grid; grid-template-columns: minmax(0, 1fr) auto; }
  .world-map-heading { display: contents; }
  .world-map-heading > .world-eyebrow { grid-column: 1 / -1; }
  .world-map-tools { grid-column: 2; grid-row: 2; gap: .5rem; }
  .world-refresh { min-width: 2.5rem; min-height: 2.5rem; padding-inline: .6rem; }
  .world-refresh :deep(.n-button__icon) { margin-right: 0; }
  .world-refresh-label { display: none; }
  .world-hero-metrics { grid-column: 1 / -1; padding-top: .6rem; gap: .5rem; align-items: center; }
  .world-hero-metrics > .world-page-actions { width: 100%; }
}

.world-hero { align-items: center; }
.world-hero-metrics { align-items: center; gap: .75rem; }
@media(min-width: 621px) {
  .world-hero { padding: .85rem; gap: .85rem; }
  .world-crest { flex-basis: 4rem; height: 4rem; font-size: 1.7rem; }
  .world-identity h1 { margin: 0 0 .25rem; font-size: clamp(1.35rem, 2.3vw, 2rem); }
}
.world-object-tabs { min-width: 0; border: 1px solid var(--border); border-radius: .85rem; background: var(--bg-surface); }
.world-object-tabs > .world-tabs { margin: 0; border: 0; border-bottom: 1px solid var(--border); border-radius: .85rem .85rem 0 0; padding: .35rem .75rem 0; background: transparent; }
.world-object-tabs .world-tab { border: 0; border-bottom: 2px solid transparent; border-radius: .45rem .45rem 0 0; padding: .75rem 1rem; box-shadow: none; }
.world-object-tabs .world-tab.active { border-bottom-color: var(--primary); background: var(--primary-soft); }
.world-object-tabs > .world-panel, .world-object-tabs > .world-tab-panel { border: 0; border-radius: 0 0 .85rem .85rem; background: transparent; }
@media(max-width: 620px) { .world-object-tabs > .world-tabs { padding-inline: .4rem; }.world-object-tabs .world-tab { padding: .65rem .6rem; font-size: .85rem; } }
</style>

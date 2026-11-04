<script setup lang="ts">
import WorldHero from './WorldHero.vue';
import WorldSectionHeading from './WorldSectionHeading.vue';

import WorldPresenceBadge from './WorldPresenceBadge.vue';
import { useWorldPresence } from '@/hooks/useWorldPresence';
import AppFacts from '@/components/AppFacts.vue';
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
const presence = useWorldPresence(computed(() => world.node?.status === 'active' && world.capabilities?.world_write && (!nodeId.value || world.node.id === nodeId.value) ? world.node.id : null), session);
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
const facts = computed(() => {
  const current = world.node;
  if (!current) return [];
  const exposure = String(detail.value.exposure_class ?? '—');
  const exposureLabels: Record<string, string> = { outdoor: 'Под открытым небом', covered: 'Под навесом', indoor: 'В помещении', carried: 'В рюкзаке' };
  return [
    { key: 'object', label: 'Объект', icon: nodeIcon.value, value: `${current.label} · №${current.id}` },
    { key: 'status', label: 'Статус', icon: statusIcons[current.status] || 'check-circle', value: statuses[current.status] || current.status },
    { key: 'access', label: 'Доступ', icon: current.visibility === 'private' ? 'lock' : 'globe', value: current.visibility === 'private' ? 'Личный' : 'Открытый' },
    { key: 'coordinates', label: 'Координаты', icon: 'crosshairs', value: `${current.coordinates.x}, ${current.coordinates.y}` },
    { key: 'condition', label: 'Прочность', icon: 'shield-halved', value: `${detail.value.condition ?? '—'} / ${detail.value.max_condition ?? '—'}` },
    { key: 'area', label: 'Площадь', icon: 'map', value: String(detail.value.area ?? '—') },
    { key: 'exposure', label: 'Защита', icon: 'house', value: exposureLabels[exposure] ?? exposure },
  ];
});
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
    world-hero(:title="world.node.label" :icon="nodeIcon" :parent-to="world.node.parent_id ? `/world/nodes/${world.node.parent_id}` : undefined" :parent-label="parentName" :aria-label="nodeKind + ': ' + world.node.label")
      world-presence-badge(v-if="presence.enabled.value" :count="presence.counts.value[world.node.id] || 0" :here="presence.current.value?.node_id === world.node.id")
      span {{ nodeKind }} · №{{ world.node.id }}
      font-awesome-icon(:icon="statusIcons[world.node.status] || 'question-circle'" :title="statuses[world.node.status] || world.node.status" :aria-label="statuses[world.node.status] || world.node.status")
      font-awesome-icon(:icon="world.node.visibility === 'private' ? 'lock' : 'globe'" :title="world.node.visibility === 'private' ? 'Личная территория' : 'Открытая территория'")
      font-awesome-icon(v-if="world.node.details.is_lodging" icon="bed" title="Ваш ночлег" aria-label="Ваш ночлег")
      template(#actions)
        world-page-actions(:node="world.node")
        world-node-extensions(slot="header" v-bind="extensionProps" @changed="changed([world.node.id])")
    world-start-panel.world-content-card(:node="world.node" :writable="Boolean(world.capabilities?.world_write)" :owner="owner" :session="session" :revision="world.dataRevision" @changed="changed([world.node.id])")
    .world-object-tabs
      section-nav(label="Разделы объекта" connected :items="tabs.map(tab => ({ to: tabLink(tab), label: tab === 'finance' && world.node?.treasury_enabled === false ? 'Бюджет' : tabLabels[tab], icon: ({ map: 'map', cultivation: 'seedling', workshop: 'hammer', finance: 'coins' })[tab], active: activeTab === tab }))")
      section.world-panel.world-map-panel(v-if="tabs.includes('map')" v-show="activeTab === 'map'" aria-label="Карта и объекты")
        .world-panel-heading
          .world-map-heading
            world-section-heading(title="Территория" icon="map")
            .world-map-owner(v-if="world.node.owner?.user" aria-label="Владелец объекта")
              span.world-owner-label Владелец
              user-avatar(:user="world.node.owner.user" :size="30" :show-rating="false")
          .world-map-tools
            n-button.world-refresh(size="small" :loading="world.loading" :disabled="world.loading || commandBusy || !!pendingCommand" title="Обновить карту и данные объекта" aria-label="Обновить" @click="changed([world.node.id])")
              template(#icon)
                font-awesome-icon(icon="rotate" aria-hidden="true")
              span.world-refresh-label Обновить
            world-help-hint(label="Параметры объекта" symbol="i")
              app-facts(:items="facts")
        .world-children
          world-map(:presence="presence.counts.value" :location-id="presence.current.value?.node_id" :active="activeTab === 'map'" :working-node-id="activeWork?.node_id" v-model:selection="mapSelection" :node="world.node" :map="world.map" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command" @changed="changed")
            template(#information)
              world-build-panel(v-if="(world.node.status === 'constructing' || world.node.details.repair_active || world.node.details.last_build_id) && world.capabilities?.world_write" :active="activeTab === 'map'" :node-id="world.node.id" :revision="world.dataRevision" :session="session" :owner="owner" @changed="changed([world.node.id])")
              world-repair-panel(v-if="!mapSelection.length" :node="world.node" :owner="owner" :session="session" :writable="Boolean(world.capabilities?.world_write)" @changed="changed([world.node.id])")
              world-node-extensions(slot="map" :active="activeTab === 'map'" v-bind="extensionProps" @changed="changed([world.node.id])")
            template(#objects)
              world-build-palette(:node="world.node" :map="world.map" :selection="mapSelection" :owner="owner" :session="session" :revision="world.dataRevision" :writable="Boolean(world.capabilities?.world_write)" @changed="changed([world.node.id])")
            template(#items)
              world-placement-palette(:writable="Boolean(world.capabilities?.world_write)" :node="world.node" :map="world.map" :selection="mapSelection" :session="session" :revision="world.dataRevision" :command="command")

      world-node-extensions(v-show="activeTab === 'map'" :active="activeTab === 'map'" slot="content" v-bind="extensionProps" @changed="changed([world.node.id])")


      section.world-tab-panel(v-if="visitedTabs.includes('workshop')" v-show="activeTab === 'workshop'" aria-label="Вещи и крафт")
        world-section-heading.world-section-title(title="Вещи и крафт" icon="hammer")
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
        world-section-heading.world-section-title(title="Бюджет и казна" icon="coins")
        world-economy-panel(v-if="world.node.permissions.manage" :node-id="world.node.id" :children="world.map?.items ?? []" :session="session" :command="command")
          world-finance-policy.world-finance-card(v-if="world.node.permissions.administer" :node-id="world.node.id" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command")
        p(v-else) Финансовые данные доступны владельцу объекта.

</template>

<style scoped>
.world-page { display: grid; gap: 1rem; padding-block: 1rem 3rem; max-width: 1320px; }
.world-object-tabs { min-width: 0; border: 1px solid var(--border); border-radius: .9rem; background: var(--bg-surface); }
.world-panel, .world-tab-panel { min-width: 0; padding: 1rem; }
.world-tab-panel { display: grid; gap: 1rem; }
.world-panel-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .5rem 1rem; }
.world-map-heading { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem 1rem; min-width: 0; }
.world-map-owner { display: flex; align-items: center; gap: .5rem; min-width: 0; font-size: .8125rem; }
.world-owner-label { color: var(--text-muted); }
.world-map-tools { display: flex; align-items: center; gap: .25rem; margin-left: auto; }
.world-refresh { min-width: 2.75rem; min-height: 2.75rem; padding-inline: .6rem; }
.world-refresh :deep(.n-button__icon) { margin-right: 0; }
.world-refresh-label { display: none; }
.world-children { display: grid; gap: 1rem; margin-top: 1rem; }
.world-content-grid { display: grid; gap: 1rem; min-width: 0; align-items: start; }
.world-content-grid > * { min-width: 0; }
.world-content-card { min-width: 0; padding: 1rem; border: 1px solid var(--border); border-radius: .9rem; background: var(--bg-surface); }
.world-storage-card { border: 0; padding: 0; }
.world-inline-links { display: grid; gap: .75rem; }
.world-inline-links .world-manufacturing-action { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 2.75rem; padding: .65rem .9rem; border-radius: .5rem; background: var(--primary); color: var(--primary-contrast, #171717); font-weight: 650; }
@media(min-width: 760px) {
  .world-panel, .world-tab-panel { padding: 1.25rem; }
  .world-content-grid { grid-template-columns: repeat(auto-fit, minmax(min(100%, 27rem), 1fr)); }
  .world-storage-card { grid-column: 1 / -1; }
  .world-refresh-label { display: inline; }.world-refresh :deep(.n-button__icon) { margin-right: .4rem; }
  .world-inline-links { display: flex; flex-wrap: wrap; align-items: center; }
}
</style>

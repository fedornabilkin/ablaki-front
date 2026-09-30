<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NSpin } from 'naive-ui';
import { useWorldCommand } from '@/hooks/useWorldCommand';
import { useWorldStore } from '@/store/world';
import { nodeLabels, type NodeType } from '@/entities/world/types';
import { nodeFeatures, tabForHash, tabLabels, tabsForNode, type NodeTab } from '@/entities/world/nodeLayout';
import WorldMap from './WorldMap.vue';
import WorldCampsiteSupplies from './WorldCampsiteSupplies.vue';
import WorldNodeStatistics from './WorldNodeStatistics.vue';
import WorldManagement from './WorldManagement.vue';
import WorldOnboarding from './WorldOnboarding.vue';
import WorldStoragePanel from './WorldStoragePanel.vue';
import WorldEconomyPanel from './WorldEconomyPanel.vue';
import WorldFinancePolicy from './WorldFinancePolicy.vue';
import WorldOrdersPanel from './WorldOrdersPanel.vue';
import WorldPremisesPanel from './WorldPremisesPanel.vue';
import WorldConstructionPanel from './WorldConstructionPanel.vue';
import WorldBuildingOperationPanel from './WorldBuildingOperationPanel.vue';
import WorldBuildingRepairPanel from './WorldBuildingRepairPanel.vue';
import WorldRepairContractsPanel from './WorldRepairContractsPanel.vue';
import WorldDemolitionPanel from './WorldDemolitionPanel.vue';
import WorldDemolitionHistory from './WorldDemolitionHistory.vue';
import WorldShelterPanel from './WorldShelterPanel.vue';
import WorldNightsPanel from './WorldNightsPanel.vue';
import WorldGardenPanel from './WorldGardenPanel.vue';
import WorldEquipmentExpansionPanel from './WorldEquipmentExpansionPanel.vue';
import WorldHousingPanel from './WorldHousingPanel.vue';

const route = useRoute(), router = useRouter(), auth = useStore(), world = useWorldStore();
const nodeId = computed(() => route.params.id === undefined ? null : Number(route.params.id));
const invalidId = computed(() => nodeId.value !== null && (!Number.isSafeInteger(nodeId.value) || nodeId.value < 1 || nodeId.value > 2147483647));
const session = computed(() => Number(auth.state.auth.revision));
const owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0));
const purchasedRoom = ref<number | null>(null);
const command = useWorldCommand(session, owner, result => {
  if (result.room_id) purchasedRoom.value = result.room_id;
  if (result.return_node_id && nodeId.value === result.changed_node_ids[0] && result.changed_node_ids.includes(result.return_node_id)) {
    world.invalidate(result.changed_node_ids);
    void router.push(`/world/nodes/${result.return_node_id}`).catch(() => load());
    void auth.dispatch('auth/fetchData');
  } else changed(result.changed_node_ids);
});
const { busy: commandBusy, pending: pendingCommand, error: commandError } = command;
function load() { if (invalidId.value) { world.cancel(); return; } void world.load(nodeId.value); }
watch(session, value => world.setSession(value), { immediate: true, flush: 'sync' });
watch([nodeId, session], load, { immediate: true });
watch([nodeId, session], () => { purchasedRoom.value = null; }, { flush: 'sync' });
onScopeDispose(() => world.cancel());
function changed(ids: number[]) { world.invalidate(ids); load(); void auth.dispatch('auth/fetchData'); }

const features = computed(() => world.node ? nodeFeatures(world.node, world.capabilities) : null);
const tabs = computed<NodeTab[]>(() => world.node && features.value ? tabsForNode(world.node, features.value) : ['map']);
const activeTab = computed(() => tabForHash(route.hash, tabs.value));
const visitedTabs = ref<NodeTab[]>(['map']);
watch([nodeId, session], () => { visitedTabs.value = ['map']; }, { flush: 'sync' });
watch(activeTab, tab => { if (!visitedTabs.value.includes(tab)) visitedTabs.value = [...visitedTabs.value, tab]; }, { immediate: true });
const statuses: Record<string, string> = { active: 'Действует', archived: 'Архив', planned: 'Запланирован', constructing: 'Строится', paused: 'Приостановлен', damaged: 'Повреждён', destroyed: 'Разрушен' };
const icons: Record<NodeType, string> = { WORLD: 'sun', REGION: 'mountain', SETTLEMENT: 'city', BUILDING: 'house', ROOM: 'house', PLOT: 'seedling', BED: 'seedling' };
const nodeIcon = computed(() => features.value?.campsite ? 'tent' : world.node ? icons[world.node.type] : 'sun');
const nodeKind = computed(() => features.value?.campsite ? 'Усадьба' : world.node ? nodeLabels[world.node.type] : 'Мир');
const detail = computed(() => world.node?.details ?? {});
const summaryValue = computed(() => detail.value.population !== undefined ? String(detail.value.population) : detail.value.condition !== undefined ? `${detail.value.condition} / ${detail.value.max_condition ?? '—'}` : `${world.node?.coordinates.x ?? 0}, ${world.node?.coordinates.y ?? 0}`);
const summaryLabel = computed(() => detail.value.population !== undefined ? 'Жители' : detail.value.condition !== undefined ? 'Прочность' : 'Координаты');
const childTitle = computed(() => world.node?.type === 'WORLD' ? 'Регионы мира' : world.node?.type === 'REGION' ? 'Поселения региона' : world.node?.type === 'SETTLEMENT' ? 'Участки и постройки' : 'Объекты внутри');
function tabLink(tab: NodeTab) { return { path: route.path, query: route.query, hash: `#${tab}` }; }
</script>

<template lang="pug">
.container.world-page
  .world-toolbar
    router-link(to="/world") Мир
    router-link(to="/city/demo") Локальный город
    router-link(to="/craft") Мастерская
    router-link(v-if="world.capabilities?.storage_v2" to="/world/recovery") Восстановление вещей
    n-button(size="small" :loading="world.loading" @click="load") Обновить
  n-alert(v-if="commandError" type="error" role="alert") {{ commandError }}
  n-alert(v-if="pendingCommand" type="info")
    p Ответ на прошлое действие ещё не получен. Можно повторить тот же запрос.
    n-button(:loading="commandBusy" @click="command.retry") Повторить запрос
  n-alert(v-if="purchasedRoom" type="success")
    p Помещение оплачено. Откройте его, чтобы разместить вещи и назначить ночлег, если в покупке есть койка.
    router-link(:to="`/world/nodes/${purchasedRoom}`") Открыть купленное помещение
  n-alert(v-if="invalidId" type="error") Некорректный адрес объекта.
  n-alert(v-else-if="world.error" type="error" role="alert") {{ world.error }}
  n-spin(v-else-if="world.loading" size="large" aria-label="Загрузка мира")
  n-alert(v-else-if="!world.capabilities?.world_read" type="info") Мир пока закрыт. Ваши вещи и кредиты доступны в мастерской и профиле.
  n-alert(v-else-if="!world.node" type="info") В этом мире пока нет опубликованных объектов.
  template(v-else)
    section.world-hero(:aria-label="nodeKind + ': ' + world.node.name")
      .world-crest(aria-hidden="true")
        font-awesome-icon(:icon="nodeIcon")
      .world-identity
        span.world-eyebrow {{ nodeKind }} · владение №{{ world.node.id }}
        h1 {{ world.node.name }}
        p {{ world.node.visibility === 'private' ? 'Личная территория' : 'Открытая территория мира' }}
      .world-hero-metrics
        div
          span Статус
          strong {{ statuses[world.node.status] || world.node.status }}
        div
          span Объекты
          strong {{ world.node.child_count }}
        div
          span {{ summaryLabel }}
          strong {{ summaryValue }}
    section.world-panel.world-map-panel(aria-label="Карта и объекты")
      .world-panel-heading
        div
          span.world-eyebrow Территория и расположение
          h2 {{ childTitle }}
        span.world-counter {{ world.map?.items.length ?? 0 }} доступно
      .world-children
        world-map(:node="world.node" :map="world.map" :writable="Boolean(world.capabilities?.world_write)" :command="command")
    nav.world-tabs(aria-label="Разделы объекта")
      router-link.world-tab(v-for="tab in tabs" :key="tab" :to="tabLink(tab)" :class="{ active: activeTab === tab }" :aria-current="activeTab === tab ? 'page' : undefined") {{ tabLabels[tab] }}

    section.world-tab-panel(v-show="activeTab === 'map'" aria-label="Обзор объекта")
      world-onboarding(:node="world.node" :writable="Boolean(world.capabilities?.world_write)" :command="command" :session="session")

    section.world-tab-panel(v-if="visitedTabs.includes('life') && (features?.nights || features?.housing)" v-show="activeTab === 'life'" aria-label="Ночлег и здоровье")
      .world-section-title
        span.world-eyebrow Жизнь на территории
        h2 Ночлег и здоровье
      world-shelter-panel(v-if="features.nights" :node-id="world.node.id" :session="session" :command="command")
      world-nights-panel(v-if="features.nights" :node-id="world.node.id" :session="session")
      world-housing-panel(v-if="features.housing" :node-id="world.node.id" :session="session" :command="command")

    section.world-tab-panel(v-if="visitedTabs.includes('workshop') && (features?.storage || features?.housing)" v-show="activeTab === 'workshop'" aria-label="Вещи и крафт")
      .world-section-title
        span.world-eyebrow Мастерская и размещение
        h2 Вещи и крафт
      .world-inline-links
        router-link(v-if="features.storage" :to="`/world/workspace/${world.node.id}`") Изготовление в этом месте
        router-link(v-if="!features.shelter && world.node.permissions.manage && ['BUILDING', 'ROOM', 'PLOT'].includes(world.node.type)" :to="{ path: '/craft', query: { node: world.node.id } }") Открыть мастерскую
      world-storage-panel(v-if="features.storage" :node-id="world.node.id" :writable="Boolean(world.capabilities?.world_write)" :command="command" :session="session")
      world-campsite-supplies(v-if="features.campsite && features.storage && world.node.status === 'active'" :node-id="world.node.id" :session="session" :command="command")
      world-equipment-expansion-panel(v-if="features.housing" :node-id="world.node.id" :session="session" :command="command")

    section.world-tab-panel(v-if="visitedTabs.includes('finance') && features?.finance" v-show="activeTab === 'finance'" aria-label="Бюджет и казна")
      .world-section-title
        span.world-eyebrow Экономика территории
        h2 Бюджет и казна
      world-economy-panel(:node-id="world.node.id" :children="world.map?.items ?? []" :session="session" :command="command")

    section.world-tab-panel(v-if="visitedTabs.includes('development') && tabs.includes('development')" v-show="activeTab === 'development'" aria-label="Развитие объекта")
      .world-section-title
        span.world-eyebrow Развитие территории
        h2 Постройки, помещения и огород
      world-building-operation-panel(v-if="features?.building" :node-id="world.node.id" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command")
      world-building-repair-panel(v-if="features?.building" :node-id="world.node.id" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command")
      world-repair-contracts-panel(v-if="features?.building" :node-id="world.node.id" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command")
      world-demolition-panel(v-if="features?.building" :node-id="world.node.id" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command")
      world-demolition-history(v-if="features?.demolitionHistory" :node-id="world.node.id" :session="session")
      world-construction-panel(v-if="features?.construction" :node-id="world.node.id" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command")
      world-premises-panel(v-if="features?.premises" :node-id="world.node.id" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command")
      world-garden-panel(v-if="features?.garden" :node-id="world.node.id" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command")
      world-orders-panel(v-if="features?.orders" :node-id="world.node.id" :session="session" :command="command")
      router-link(v-if="features?.campsite && world.node.parent_id" :to="{ path: `/world/nodes/${world.node.parent_id}`, hash: '#settlement-orders' }") Заказы поселения

    section.world-tab-panel(v-if="visitedTabs.includes('statistics')" v-show="activeTab === 'statistics'" aria-label="Статистика объекта")
      .world-section-title
        span.world-eyebrow {{ world.node.name }} в цифрах
        h2 Статистика
      .world-stat-grid
        .world-stat-card
          span Статус
          strong {{ statuses[world.node.status] || world.node.status }}
        .world-stat-card
          span Прямые дочерние объекты
          strong {{ world.node.child_count }}
        .world-stat-card(v-if="detail.population !== undefined")
          span Жители
          strong {{ detail.population }}
        .world-stat-card(v-if="detail.condition !== undefined")
          span Прочность
          strong {{ detail.condition }} / {{ detail.max_condition ?? '—' }}
        .world-stat-card(v-if="detail.level !== undefined")
          span Уровень
          strong {{ detail.level }}
      world-node-statistics(:node="world.node" :session="session")

    section.world-tab-panel(v-if="visitedTabs.includes('manage') && world.node.permissions.administer" v-show="activeTab === 'manage'" aria-label="Управление объектом")
      .world-section-title
        span.world-eyebrow Параметры владения
        h2 Управление
      dl.world-facts.world-management-facts
        dt Объект
        dd {{ world.node.name }} · №{{ world.node.id }}
        dt Статус
        dd {{ statuses[world.node.status] || world.node.status }}
        dt Доступ
        dd {{ world.node.visibility === 'private' ? 'Личный' : 'Открытый' }}
        dt Координаты
        dd {{ world.node.coordinates.x }}, {{ world.node.coordinates.y }}
      world-finance-policy(v-if="features?.finance" :node-id="world.node.id" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command")
      world-management(:node="world.node" :writable="Boolean(world.capabilities?.world_write)" :command="command" :session="session")
</template>

<style scoped>
.world-page { display: grid; gap: 1rem; padding-block: 1.5rem 3rem; max-width: 1320px; }
.world-toolbar, .world-breadcrumbs, .world-inline-links, .world-siblings { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; }
.world-toolbar { justify-content: flex-end; font-size: .9rem; }
.world-breadcrumbs { color: var(--text-muted); font-size: .85rem; }
.world-breadcrumbs a { overflow-wrap: anywhere; }
.world-hero { display: flex; align-items: center; gap: 1.25rem; padding: clamp(1.25rem, 3vw, 2rem); border: 1px solid var(--border); border-radius: .8rem; background: radial-gradient(circle at 80% 12%, var(--primary-soft), transparent 45%), var(--bg-surface); }
.world-crest { display: grid; place-items: center; flex: 0 0 4.5rem; height: 4.5rem; border: 1px solid var(--primary); border-radius: .85rem; background: var(--primary-soft); color: var(--primary); font-size: 2rem; }
.world-identity { min-width: 0; flex: 1; }
.world-identity h1 { margin: .25rem 0; font-size: clamp(1.6rem, 3vw, 2.4rem); line-height: 1.15; }
.world-identity p { margin: 0; color: var(--text-muted); }
.world-eyebrow { color: var(--primary); font-size: .72rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.world-hero-metrics { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.world-hero-metrics div { display: grid; gap: .2rem; min-width: 5rem; }
.world-hero-metrics span, .world-stat-card span { color: var(--text-muted); font-size: .8rem; }
.world-hero-metrics strong { font-size: 1rem; overflow-wrap: anywhere; }
.world-tabs { display: flex; gap: .25rem; overflow-x: auto; border-bottom: 1px solid var(--border); scrollbar-width: thin; }
.world-tab { flex: 0 0 auto; padding: .8rem 1rem; border-bottom: 2px solid transparent; color: var(--text-muted); font-weight: 650; white-space: nowrap; }
.world-tab:hover, .world-tab.active { color: var(--primary); }
.world-tab.active { border-color: var(--primary); }
.world-tab-panel { display: grid; gap: 1rem; min-width: 0; }
.world-overview-grid { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(16rem, .8fr); gap: 1rem; align-items: start; }
.world-panel, .world-stat-card { min-width: 0; padding: 1.25rem; border: 1px solid var(--border); border-radius: .75rem; background: var(--bg-surface); }
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
.world-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: .75rem; }
.world-stat-card { display: grid; gap: .35rem; }
.world-stat-card strong { font-size: 1.2rem; }
.world-management-facts { max-width: 35rem; padding: 1.25rem; border: 1px solid var(--border); border-radius: .6rem; background: var(--bg-surface); }
@media (max-width: 900px) { .world-hero { flex-wrap: wrap; } .world-hero-metrics { width: 100%; padding-top: 1rem; border-top: 1px solid var(--border); } .world-overview-grid { grid-template-columns: 1fr; } }
@media (max-width: 540px) { .world-crest { flex-basis: 3.5rem; height: 3.5rem; font-size: 1.5rem; } .world-hero-metrics { justify-content: space-between; gap: .75rem; } .world-tab { padding-inline: .75rem; } }
</style>

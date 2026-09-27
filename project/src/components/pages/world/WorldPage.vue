<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NCard, NSpin } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import PagePager from '@/components/PagePager.vue';
import ListFilters from '@/components/ListFilters.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { useWorldCommand } from '@/hooks/useWorldCommand';
import { useWorldStore } from '@/store/world';
import { nodeLabels, nodeTypes } from '@/entities/world/types';
import WorldMap from './WorldMap.vue';
import WorldManagement from './WorldManagement.vue';
import WorldOnboarding from './WorldOnboarding.vue';
import WorldStoragePanel from './WorldStoragePanel.vue';
import WorldEconomyPanel from './WorldEconomyPanel.vue';
import WorldFinancePolicy from './WorldFinancePolicy.vue';
import WorldOrdersPanel from './WorldOrdersPanel.vue';
import WorldPremisesPanel from './WorldPremisesPanel.vue';
import WorldShelterPanel from './WorldShelterPanel.vue';
import WorldNightsPanel from './WorldNightsPanel.vue';
import WorldGardenPanel from './WorldGardenPanel.vue';
import WorldEquipmentExpansionPanel from './WorldEquipmentExpansionPanel.vue';
import WorldHousingPanel from './WorldHousingPanel.vue';
const route = useRoute(), auth = useStore(), world = useWorldStore();
const list = useListQuery({ type: '' }, { defaultSort: 'position' });
const { page, search, filters } = list;
const mode = ref<'map' | 'list'>('map');
const nodeId = computed(() => route.params.id === undefined ? null : Number(route.params.id));
const invalidId = computed(() => nodeId.value !== null && (!Number.isSafeInteger(nodeId.value) || nodeId.value < 1 || nodeId.value > 2147483647));
const title = computed(() => world.node?.name || 'Мир');
const requestParams = computed(() => ({ page: page.value, 'per-page': 20, q: list.params.value.q || '', type: filters.value.type }));
const filterDefinitions = [{ key: 'type', label: 'Тип объекта', options: nodeTypes.map(type => ({ label: nodeLabels[type], value: type })) }];
const session = computed(() => Number(auth.state.auth.revision));
const owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0));
const purchasedRoom = ref<number | null>(null);
const command = useWorldCommand(session, owner, result => { if (result.room_id) purchasedRoom.value = result.room_id; changed(result.changed_node_ids); });
const { busy: commandBusy, pending: pendingCommand, error: commandError } = command;
function load() { if (invalidId.value) { world.cancel(); return; } void world.load(nodeId.value, requestParams.value); }
watch(session, value => world.setSession(value), { immediate: true, flush: 'sync' });
watch([nodeId, requestParams, session], load, { immediate: true });
watch([nodeId, session], () => { purchasedRoom.value = null; }, { flush: 'sync' });
onScopeDispose(() => world.cancel());
function changed(ids: number[]) { world.invalidate(ids); load(); void auth.dispatch('auth/fetchData'); }
const pager = computed(() => ({ ...world.children, items: world.children.items.map(node => ({ ...node })) }));
const statuses: Record<string, string> = { active: 'Действует', archived: 'Архив', planned: 'Запланирован', constructing: 'Строится', paused: 'Приостановлен', damaged: 'Повреждён', destroyed: 'Разрушен' };
</script>
<template lang="pug">
page-header(:pageTitle="title")
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
    nav.world-breadcrumbs(aria-label="Путь в мире")
      template(v-for="(crumb, index) in world.breadcrumbs" :key="crumb.id")
        span(v-if="index" aria-hidden="true") /
        router-link(:to="`/world/nodes/${crumb.id}`" :aria-current="crumb.id === world.node.id ? 'page' : undefined") {{ crumb.name }}
    nav.world-toolbar(v-if="world.node.parent_id && world.siblings.total > 1" aria-label="Соседние объекты")
      router-link(v-for="sibling in world.siblings.items.filter(item => item.id !== world.node?.id)" :key="sibling.id" :to="`/world/nodes/${sibling.id}`") {{ sibling.name }}
      router-link(v-if="world.siblings.total > world.siblings.items.length" :to="`/world/nodes/${world.node.parent_id}`") Все соседние объекты
    n-card(:title="world.node.name")
      p {{ nodeLabels[world.node.type] }} · {{ statuses[world.node.status] || 'Недоступен' }}
      p(v-if="world.node.details.population !== undefined") Население: {{ world.node.details.population }}
      p(v-if="world.node.details.condition !== undefined") Прочность: {{ world.node.details.condition }} / {{ world.node.details.max_condition }}
      p(v-if="world.node.visibility === 'private'") Личный объект
      p(v-if="world.node.type === 'BED'") {{ world.node.details.unlocked ? 'Грядка открыта. Посев появится на следующем этапе.' : 'Грядка закрыта. Приобрести открытие можно в огороде.' }}
      router-link(v-if="world.node.type === 'BED' && world.node.parent_id" :to="`/world/nodes/${world.node.parent_id}#garden`") Открыть огород и покупку грядок
      router-link(v-if="world.node.details.shelter_plot_id" :to="`/world/nodes/${world.node.details.shelter_plot_id}#shelter`") Управлять шалашом и ночлегом на стоянке
      router-link(v-if="!world.node.details.shelter_instance_id && world.node.permissions.manage && ['BUILDING', 'ROOM', 'PLOT'].includes(world.node.type)" :to="{ path: '/craft', query: { node: world.node.id } }") Открыть мастерскую
    world-onboarding(:node="world.node" :writable="Boolean(world.capabilities?.world_write)" :command="command" :session="session")
    world-shelter-panel(v-if="world.node.status === 'active' && world.node.type === 'PLOT' && world.node.details.plot_kind === 'campsite' && world.node.permissions.storage" :node-id="world.node.id" :session="session" :command="command")
    world-nights-panel(v-if="world.node.status === 'active' && world.node.type === 'PLOT' && world.node.details.plot_kind === 'campsite' && world.node.permissions.storage" :node-id="world.node.id" :session="session")
    router-link(v-if="world.capabilities?.storage_v2 && !world.node.details.shelter_instance_id && world.node.permissions.storage && ['PLOT', 'BUILDING', 'ROOM'].includes(world.node.type)" :to="`/world/workspace/${world.node.id}`") Изготовление в этом месте
    world-storage-panel(v-if="world.capabilities?.storage_v2 && !world.node.details.shelter_instance_id && world.node.permissions.storage" :node-id="world.node.id" :writable="Boolean(world.capabilities?.world_write)" :command="command" :session="session")
    world-economy-panel(v-if="!world.node.details.shelter_instance_id" :node-id="world.node.id" :session="session" :command="command")
    world-equipment-expansion-panel(v-if="world.node.type === 'ROOM' && world.node.permissions.storage" :node-id="world.node.id" :session="session" :command="command")
    world-housing-panel(v-if="world.node.type === 'ROOM' && world.node.permissions.storage" :node-id="world.node.id" :session="session" :command="command")
    world-premises-panel(v-if="world.node.status === 'active' && ((world.node.type === 'SETTLEMENT' && world.node.visibility === 'public') || (world.node.type === 'PLOT' && world.node.details.plot_kind === 'campsite' && world.node.permissions.storage))" :node-id="world.node.id" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command")
    world-garden-panel(v-if="world.node.status === 'active' && ((world.node.type === 'SETTLEMENT' && world.node.visibility === 'public') || (world.node.type === 'PLOT' && ['campsite', 'garden'].includes(String(world.node.details.plot_kind)) && world.node.permissions.storage))" :node-id="world.node.id" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command")
    world-orders-panel(v-if="world.node.type === 'SETTLEMENT' && world.node.visibility === 'public' && world.node.status === 'active'" :node-id="world.node.id" :session="session" :command="command")
    router-link(v-if="world.node.type === 'PLOT' && world.node.details.plot_kind === 'campsite' && world.node.parent_id" :to="{ path: `/world/nodes/${world.node.parent_id}`, hash: '#settlement-orders' }") Заказы поселения
    world-finance-policy(v-if="!world.node.details.shelter_instance_id && world.node.permissions.administer" :node-id="world.node.id" :session="session" :writable="Boolean(world.capabilities?.world_write)" :command="command")
    .world-children
      h2 Объекты внутри
      list-filters(v-model:search="search" v-model:values="filters" :filters="filterDefinitions" :loading="world.loading" placeholder="Найти объект" @reset="list.reset")
      .world-modes
        n-button(size="small" :type="mode === 'map' ? 'primary' : 'default'" @click="mode = 'map'") Карта
        n-button(size="small" :type="mode === 'list' ? 'primary' : 'default'" @click="mode = 'list'") Список
      p(v-if="!world.children.items.length") Объекты не найдены.
      world-map(v-else-if="mode === 'map'" :nodes="world.children.items")
      ul.world-list(v-else)
        li(v-for="child in world.children.items" :key="child.id")
          router-link(:to="`/world/nodes/${child.id}`") {{ child.name }}
          span {{ nodeLabels[child.type] }} · Объектов: {{ child.child_count }}
      page-pager(v-model:page="page" :result="pager" :disabled="world.loading")
    world-management(v-if="world.node.permissions.administer" :node="world.node" :writable="Boolean(world.capabilities?.world_write)" :command="command" :session="session")
</template>
<style scoped>
.world-page { display: grid; gap: 1rem; padding-bottom: 2rem; }
.world-toolbar, .world-breadcrumbs, .world-modes { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; }
.world-breadcrumbs a { overflow-wrap: anywhere; }
.world-modes { margin-bottom: 1rem; }
.world-list { list-style: none; padding: 0; display: grid; gap: .5rem; }
.world-list li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .5rem; padding: .75rem; border: 1px solid var(--border); border-radius: .4rem; }
.world-list span { color: var(--text-muted); }
</style>

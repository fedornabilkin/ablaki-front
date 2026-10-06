<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NCard, NCollapse, NCollapseItem, NPagination, NSpin } from 'naive-ui';
import ListFilters from '@/components/ListFilters.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { useWorldCommand } from '@/hooks/useWorldCommand';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import * as api from '@/services/api/simpleWorld';
import { worldError } from '@/services/api/world';
import SimpleBuildPanel from './SimpleBuildPanel.vue';
import WorldCultivationPanel from './WorldCultivationPanel.vue';
import WorldHarvestPanel from './WorldHarvestPanel.vue';
import WorldHousingPanel from './WorldHousingPanel.vue';
import SimpleBudgetPanel from './SimpleBudgetPanel.vue';
import WorldStoragePanel from './WorldStoragePanel.vue';
const route = useRoute(), router = useRouter(), auth = useStore();
const owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0)), session = computed(() => Number(auth.state.auth.revision));
const current = ref<api.SimpleNode | null>(null), home = ref<api.SimpleNode | null>(null), children = ref<api.SimpleNode[]>([]);
const loading = ref(false), error = ref(''), message = ref(''), total = ref(0), pageSize = ref(20);
const { page, search, params, reset } = useListQuery();
const command = useWorldCommand(session, owner, () => { void load(); });
let epoch = 0, disposed = false;
const nodeId = computed(() => route.params.id === undefined ? null : Number(route.params.id));
const runner = useSimpleWorldCommand(computed(() => `${owner.value}.${nodeId.value}.page`), session);
const canOwn = computed(() => current.value?.owner_user_id === owner.value);
async function load() {
  const token = ++epoch; loading.value = true; error.value = '';
  if (nodeId.value !== null && (!Number.isSafeInteger(nodeId.value) || nodeId.value < 1)) { error.value = 'Некорректный адрес объекта.'; loading.value = false; return; }
  try {
    const id = nodeId.value;
    const [node, result, campsite] = await Promise.all([id === null ? Promise.resolve(null) : api.object(id),
      api.objects({ ...params.value, page: page.value, ...(id === null ? { hierarchy_level: 1 } : { parent_id: id }) }), api.startState()]);
    if (disposed || token !== epoch) return;
    current.value = node; children.value = result.items; total.value = result.total; pageSize.value = result.pageSize; home.value = campsite;
  } catch (cause) { if (!disposed && token === epoch) error.value = worldError(cause); }
  finally { if (!disposed && token === epoch) loading.value = false; }
}
async function act(kind: 'start' | 'gather' | 'retry') {
  if (!current.value) return;
  const result = kind === 'retry' ? await runner.retry() : kind === 'start'
    ? await runner.submit('start', { city_id: current.value.id }) : await runner.submit(`objects/${current.value.id}/gather`);
  if (!result) return;
  if (result.node) await router.push(`/world/nodes/${api.node(result.node).id}`);
  if (typeof result.message === 'string') message.value = result.message;
}
watch([nodeId, session, page, params], () => { current.value = null; children.value = []; message.value = ''; void load(); }, { immediate: true });
onScopeDispose(() => { disposed = true; epoch++; });
</script>
<template lang="pug">
.container.simple-world
  h1 {{ current?.name || 'Мир' }}
  nav
    router-link(to="/world") Мир
    router-link(v-if="current?.parent_id" :to="`/world/nodes/${current.parent_id}`") На уровень выше
    router-link(v-if="home" :to="`/world/nodes/${home.id}`") Моя стоянка
    router-link(to="/craft") Предметы и крафт
    router-link(v-if="current?.status === 'active' && canOwn" :to="`/world/workspace/${current.id}`") Мастерская
  n-alert(v-if="error" type="error") {{ error }}
  n-alert(v-if="runner.error.value" type="error") {{ runner.error.value }}
  n-alert(v-if="message" type="success") {{ message }}
  n-button(v-if="runner.pending.value" :loading="runner.busy.value" @click="act('retry')") Повторить запрос
  n-alert(v-if="command.error.value" type="error") {{ command.error.value }}
  n-button(v-if="command.pending.value" :loading="command.busy.value" @click="command.retry") Повторить прошлое действие
  n-spin(v-if="loading && !current")
  template(v-else)
    n-card(v-if="current?.hierarchy_level === 3 && !home" title="Начало игры")
      p Получите доски, инструменты, семена и эликсир. Сначала обустройте стоянку, затем постройте шалаш, огород или шахту.
      n-button(type="primary" :disabled="!!runner.pending.value" :loading="runner.busy.value" @click="act('start')") Начать здесь
    list-filters(v-model:search="search" :loading="loading" placeholder="Найти объект" @reset="reset")
    ul.object-list
      li(v-for="child in children" :key="child.id")
        router-link(:to="`/world/nodes/${child.id}`") {{ child.name }}
        span {{ child.status === 'active' ? 'Готово' : 'Строится' }} · уровень {{ child.hierarchy_level }}
    p(v-if="!children.length") Здесь пока нет объектов.
    n-pagination(v-if="total > pageSize" v-model:page="page" :page-size="pageSize" :item-count="total")
    simple-build-panel(v-if="current && current.hierarchy_level >= 4" :node="current" :owner="owner" :session="session" @changed="load")
    world-cultivation-panel(v-if="current?.node_type === 'BED' && current.status === 'active' && canOwn" :bed-id="current.id" :session="session" :command="command")
    world-harvest-panel(v-if="current?.node_type === 'PLOT' && current.hierarchy_level === 5 && current.status === 'active'" :node-id="current.id" :session="session" :revision="current.revision" :command="command")
    world-housing-panel(v-if="current?.node_type === 'ROOM' && current.status === 'active' && canOwn" :node-id="current.id" :session="session" :command="command")
    n-card(v-if="current?.status === 'active' && canOwn && (current.hierarchy_level === 4 || current.building_kind === 'mine')" title="Добыча ресурсов")
      p {{ current.building_kind === 'mine' ? 'Получите руду, уголь и камень. Нужна кирка в рюкзаке.' : 'Соберите древесину, камень, воду и волокна для простых построек и инструментов.' }}
      p Ресурсы можно получить один раз в день.
      n-button(:loading="runner.busy.value" :disabled="!!runner.pending.value" @click="act('gather')") Собрать ресурсы
    simple-budget-panel(v-if="current?.status === 'active' && canOwn" :node-id="current.id" :owner="owner" :session="session")
    n-collapse(v-if="current?.status === 'active' && canOwn")
      n-collapse-item(title="Имущество и хранилища" name="storage")
        world-storage-panel(:node-id="current.id" :session="session" :writable="true" :command="command")
</template>
<style scoped>
.simple-world { max-width: 1000px; padding-bottom: 2rem; }
nav { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
.object-list { list-style: none; padding: 0; }
.object-list li { display: flex; justify-content: space-between; gap: 1rem; padding: .7rem 0; border-bottom: 1px solid #8884; }
.n-card { margin: 1rem 0; }
</style>

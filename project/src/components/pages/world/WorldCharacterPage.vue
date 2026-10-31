<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NSelect, NSpin } from 'naive-ui';
import { milestoneLabels, type MvpState } from '@/services/api/worldMvp';
import { loadCharacterOverview, type parseProgression } from '@/services/api/worldCharacter';
import { loadWorldNavigation, loadWorldOnboarding, worldError } from '@/services/api/world';
import { objects, type Build, type SimpleNode } from '@/services/api/simpleWorld';
import { loadStorageList, loadStorageContents, type StorageHeader, type StorageView } from '@/services/api/worldStorage';
import { loadHousing } from '@/services/api/worldHousing';
import { loadNights } from '@/services/api/worldNights';
import WorldCharacterProgress from './WorldCharacterProgress.vue';
import WorldCredits from './WorldCredits.vue';
import WorldQuotaNotice from './WorldQuotaNotice.vue';

const auth = useStore(), route = useRoute();
const owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0)), session = computed(() => Number(auth.state.auth.revision));
const name = computed(() => auth.getters['auth/user']?.username ?? auth.getters['auth/user']?.login ?? `Персонаж №${owner.value}`);
const mvp = shallowRef<MvpState | null>(null), membership = shallowRef<Awaited<ReturnType<typeof loadWorldOnboarding>> | null>(null);
const progression = shallowRef<ReturnType<typeof parseProgression> | null>(null);
const housing = shallowRef<Awaited<ReturnType<typeof loadHousing>> | null>(null), nights = shallowRef<Awaited<ReturnType<typeof loadNights>> | null>(null);
const residence = shallowRef<Awaited<ReturnType<typeof loadWorldNavigation>> | null>(null);
const work = shallowRef<Build | null>(null), property = shallowRef<SimpleNode[]>([]), storages = shallowRef<StorageHeader[]>([]), contents = shallowRef<StorageView | null>(null);
const selectedStorage = ref<number | null>(null), loading = ref(false), storageLoading = ref(false), propertyLoading = ref(false);
const errors = ref<string[]>([]), storageError = ref(''), propertyError = ref(''), total = ref(0), pageSize = ref(20);
const page = computed(() => { const n = Number(route.query.objects_page ?? 1); return Number.isSafeInteger(n) && n > 0 && n <= 1000000 ? n : 1; });
const home = computed(() => membership.value?.starter_site_id ?? null);
const homeHref = computed(() => home.value ? `/world/nodes/${home.value}` : '/world');
const labels: Record<string, string> = {active: 'Доступен', constructing: 'Строится', planned: 'Запланирован', archived: 'Архив'};
const date = (value: number | null | undefined) => value ? new Date(value * 1000).toLocaleString('ru-RU') : '—';
let generation = 0, storageGeneration = 0, propertyGeneration = 0;
async function loadProperty() {
  const current = ++propertyGeneration, actor = owner.value; propertyLoading.value = true; propertyError.value = '';
  try { const result = await objects({owner_user_id: actor, page: page.value, 'per-page': 20}); if (current === propertyGeneration) { property.value = result.items; total.value = result.total; pageSize.value = result.pageSize; } }
  catch (cause) { if (current === propertyGeneration) propertyError.value = worldError(cause); }
  finally { if (current === propertyGeneration) propertyLoading.value = false; }
}
async function load() {
  const current = ++generation; loading.value = true; errors.value = []; selectedStorage.value = null; storages.value = []; contents.value = null;
  mvp.value = null; progression.value = null; membership.value = null; housing.value = null; nights.value = null; residence.value = null; work.value = null; property.value = []; total.value = 0;
  const accept = async <T,>(label: string, request: Promise<T>, save: (value: T) => void) => {
    try { const value = await request; if (current === generation) save(value); }
    catch (cause) { if (current === generation) errors.value.push(`${label}: ${worldError(cause)}`); }
  };
  await Promise.allSettled([
    accept('Состояние мира', loadCharacterOverview(), value => {mvp.value = value.economy; progression.value = value.progression; work.value = value.work;}),
    accept('Заселение', loadWorldOnboarding(), value => {membership.value = value;}),
    loadProperty(),
  ]);
  if (current !== generation) return;
  await Promise.allSettled([
    accept('Хранилища', loadStorageList(home.value), value => {storages.value = value; selectedStorage.value = value.find(s => s.kind === 'backpack')?.id ?? value[0]?.id ?? null;}),
    ...(home.value ? [accept('Место жительства', loadWorldNavigation(home.value), value => {residence.value = value;}), accept('Ночлег', loadHousing(home.value), value => {housing.value = value;}), accept('Ночи', loadNights(home.value, 1, '', 5), value => {nights.value = value;})] : []),
  ]);
  if (current === generation) loading.value = false;
}
async function loadItems() {
  const current = ++storageGeneration, id = selectedStorage.value; contents.value = null; storageError.value = '';
  if (!id) { storageLoading.value = false; return; }
  storageLoading.value = true;
  try { const value = await loadStorageContents(id); if (current === storageGeneration) contents.value = value; }
  catch (cause) { if (current === storageGeneration) storageError.value = worldError(cause); }
  finally { if (current === storageGeneration) storageLoading.value = false; }
}
watch([owner, session], load, {immediate: true});
watch(page, () => { void loadProperty(); });
watch(selectedStorage, loadItems);
onScopeDispose(() => {generation++; storageGeneration++; propertyGeneration++;});
</script>
<template lang="pug">
main.container.character-page
  header.character-hero
    div
      h1
        font-awesome-icon(icon="user" aria-hidden="true")
        |  {{ name }}
      p Данные персонажа в мире
    .character-actions
      router-link(:to="homeHref") К стоянке
      router-link(to="/world") Карта мира
      n-button(size="small" :loading="loading" :disabled="loading" @click="load") Обновить
  n-alert(v-for="error in errors" :key="error" type="warning") {{ error }}
  n-spin(v-if="loading && !mvp" aria-label="Загрузка персонажа")
  .character-grid
    section.character-card
      world-character-progress(:key="session" :session="session" :health="mvp?.health" :managed="true" :progression="progression" :pending="loading" :health-error="!loading && !mvp ? 'Не удалось загрузить персонажа. Нажмите Обновить.' : ''")
    section.character-card(v-if="membership")
      h2 Заселение и ночлег
      p {{ membership.joined ? 'В мире с ' + date(membership.joined_at) : 'Вы ещё не вступили в мир' }}
      p(v-if="home") Стоянка №{{ home }}
      nav.character-residence(v-if="residence" aria-label="Место жительства")
        router-link(v-for="place in [...residence.breadcrumbs, residence.node]" :key="place.id" :to="`/world/nodes/${place.id}`") {{ place.label }}
      p(v-if="mvp") Личный баланс: #[world-credits(:value="mvp.personalCredits ?? '0'")]
      p(v-if="mvp?.targetStartCredits") Стартовые средства: #[world-credits(:value="mvp.targetStartCredits")] · {{ mvp.starterPaid ? 'получены' : 'ещё не получены' }}
      router-link(v-if="housing?.current" :to="`/world/nodes/${housing.current.node_id}`") Ночлег: {{ housing.current.kind === 'house' ? 'дом' : 'шалаш' }} №{{ housing.current.node_id }}
      p(v-else) Ночлег не назначен.
      template(v-if="nights?.enabled")
        p {{ nights.protection_forecast ? 'Ближайшая ночь защищена' : 'Для ближайшей ночи нужна защита' }}
        p(v-if="nights.current_or_next_night") Ближайшая ночь: {{ date(nights.current_or_next_night.started_at) }}
        p(v-if="nights.health") Болезнь: {{ nights.health.severity }} · эффективность труда {{ nights.health.work_efficiency_bps / 100 }}%
    section.character-card(v-if="mvp")
      h2 Лимиты
      world-quota-notice(v-for="quota in mvp.quotas" :key="quota.kind" :quota="quota" :server-time="mvp.serverTime")
    section.character-card(v-if="mvp")
      h2 Еда и здоровье
      p(v-if="!mvp.health.foods.length") В рюкзаке пока нет доступных блюд.
      p(v-for="food in mvp.health.foods" :key="food.code") {{ food.name }} × {{ food.quantity }} · +{{ food.restore }} здоровья{{ food.repeatRemaining === null ? '' : ` · осталось повторов: ${food.repeatRemaining}` }}
      router-link(to="/world/workspace/inventory") Открыть рюкзак и поесть
    section.character-card
      h2 Текущая стройка
      template(v-if="work")
        p {{ work.worked_seconds }} / {{ work.required_seconds }} с
        router-link(:to="`/world/nodes/${work.node_id}`") Вернуться к работе
      p(v-else) Активной строительной работы нет.
    section.character-card(v-if="mvp")
      h2 Задания
      details(v-for="goal in mvp.goals" :key="goal.code" :open="!goal.claimed")
        summary {{ goal.code === 'day-1' ? 'Лагерь' : 'Ресурсы' }} · {{ goal.claimed ? 'Награда получена' : `${goal.steps.filter(s => s.completed).length} / ${goal.steps.length}` }}
        p Награда: #[world-credits(:value="goal.credits")]
        p(v-for="step in goal.steps" :key="step.code") {{ step.completed ? '✓' : '○' }} {{ milestoneLabels[step.code] ?? step.code }} · {{ step.quantity }} / {{ step.required }}
  section.character-card
    .character-section-heading
      h2 Мои объекты · {{ total }}
      n-spin(v-if="propertyLoading" size="small")
    n-alert(v-if="propertyError" type="warning") {{ propertyError }}
    .character-property-list
      router-link(v-for="item in property" :key="item.id" :to="`/world/nodes/${item.id}`")
        strong {{ item.name }}
        small {{ labels[item.status] ?? item.status }} · №{{ item.id }}
    p(v-if="!propertyLoading && !property.length") Объектов пока нет.
    nav.character-actions(v-if="total > pageSize" aria-label="Страницы объектов")
      router-link(v-if="page > 1" :to="{path: '/world/character', query: {...route.query, objects_page: page - 1}}") Назад
      span {{ page }} / {{ Math.ceil(total / pageSize) }}
      router-link(v-if="page * pageSize < total" :to="{path: '/world/character', query: {...route.query, objects_page: page + 1}}") Далее
  section.character-card
    h2 Вещи и хранилища
    n-select(v-if="storages.length" v-model:value="selectedStorage" :options="storages.map(s => ({value: s.id, label: `${s.name} · ${s.capacity} мест`}))" aria-label="Хранилище персонажа")
    n-spin(v-if="storageLoading" size="small")
    n-alert(v-if="storageError" type="warning")
      p {{ storageError }}
      n-button(size="small" @click="loadItems") Обновить вещи
    .character-property-list(v-if="contents")
      div(v-for="item in contents.items" :key="item.id")
        strong {{ item.name }} × {{ item.quantity }}
        small(v-for="unit in item.instances" :key="unit.id") Прочность {{ unit.durability }} / {{ unit.max_durability }}
      p(v-if="!contents.items.length") Хранилище пусто.
    router-link(v-if="selectedStorage" :to="`/world/storage/${selectedStorage}`") Открыть хранилище
    router-link(to="/world/workspace/history") История действий и расчётов →
</template>
<style scoped>
.character-residence { display: flex; flex-wrap: wrap; gap: .35rem; font-size: .8rem; }.character-residence a + a::before { content: '›'; margin-right: .35rem; color: var(--text-muted); }
.character-page { display: grid; gap: 1rem; padding-block: 1rem 2rem; }.character-hero, .character-section-heading { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: .75rem; }.character-hero { padding: 1.2rem; background: var(--bg-surface); border: 1px solid var(--border); border-radius: .75rem; }.character-hero h1 { margin: 0 0 .35rem; font-size: 1.5rem; }.character-hero p { margin: 0; color: var(--text-muted); }.character-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .7rem; }.character-actions a { padding: .35rem .6rem; border: 1px solid var(--border); border-radius: .4rem; }.character-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; align-items: start; }.character-card { display: grid; gap: .65rem; padding: 1rem; border: 1px solid var(--border); border-radius: .65rem; background: var(--bg-surface); min-width: 0; }.character-card h2 { margin: 0; font-size: 1.05rem; }.character-card p { margin: 0; font-size: .85rem; }.character-card details { font-size: .85rem; }.character-card details p { margin-top: .4rem; }.character-property-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: .5rem; }.character-property-list > a, .character-property-list > div { display: grid; gap: .25rem; border: 1px solid var(--border); border-radius: .45rem; padding: .65rem; font-size: .85rem; }.character-property-list small { color: var(--text-muted); }@media(max-width: 650px) { .character-grid { grid-template-columns: 1fr; } }
</style>

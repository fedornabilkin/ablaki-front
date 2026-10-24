<script setup lang="ts">
import { worldActionButtonTheme, worldModalTheme } from '@/entities/world/theme';
import { formatCredits } from '@/entities/world/credits';
import { computed, ref, watch, onMounted, onScopeDispose, nextTick } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NInput, NPopover, NPagination, NModal } from 'naive-ui';
import CraftRoadmap from './CraftRoadmap.vue';
import CraftRecipeDetail from './CraftRecipeDetail.vue';
import CraftInventory from './CraftInventory.vue';
import { useCraftToasts } from '@/hooks/useCraftToasts';
import { useClassicCraft } from '@/hooks/useClassicCraft';
import { useWorldCommand } from '@/hooks/useWorldCommand';
import { useCampsiteCraft } from '@/hooks/useCampsiteCraft';
import { loadCraftHistory, craftError, type CraftEvent } from '@/services/api/classicCraft';
import { craftRequirements } from '@/entities/craft/classic';
import { date } from '@/services/api/portal';
import WorldWorkspaceNav from '../world/WorldWorkspaceNav.vue';
import WorldEconomyHistory from '../world/WorldEconomyHistory.vue';
import WorldWorkspaceHero from '../world/WorldWorkspaceHero.vue';
import { workspaceNode } from '@/entities/world/workspaceNavigation';
const store = useStore();
const session = computed(() => store.state.auth.revision);
const homeCraftHref = useCampsiteCraft(session);
const craft = useClassicCraft(session, () => store.dispatch('auth/fetchData'), computed(() => Number(store.getters['auth/user']?.id)));
const {state, busy, loading, error, notice, pending} = craft;
const slotRevision = ref(0);
const slotCommand = useWorldCommand(session, computed(() => Number(store.getters['auth/user']?.id)), () => { slotRevision.value++; void craft.refresh(); void store.dispatch('auth/fetchData').catch(() => undefined); });
const route = useRoute(), router = useRouter();
const nodeId = computed(() => workspaceNode(route.query.node));
const craftHref = computed(() => nodeId.value ? `/world/workspace/${nodeId.value}` : homeCraftHref.value);
const storageHref = computed(() => craftHref.value.startsWith('/world/workspace/') ? craftHref.value.replace('/workspace/', '/nodes/') + '#workshop' : '/world');
useCraftToasts(notice, session);
const tab = computed(() => String(route.meta.workspaceSection ?? 'recipes'));
const pageTitle = computed(() => ({ inventory: 'Инвентарь', recipes: 'Рецепты', map: 'Карта рецептов', history: 'История крафта' } as Record<string, string>)[tab.value]);
const pageIcon = computed(() => ({ inventory: 'box', recipes: 'scroll', map: 'map', history: 'calendar-days' } as Record<string, string>)[tab.value]);
const pageDescription = computed(() => ({ inventory: 'Рюкзак и переносимые контейнеры. Выбирайте предметы для использования и перемещения.', recipes: 'Рецепты и доступные материалы. Выберите предмет, чтобы изучить его или перейти к изготовлению.', map: 'Связи рецептов, материалы и оборудование для изготовления.', history: 'Изготовление, использование и перемещение ваших предметов.' } as Record<string, string>)[tab.value]);
const selected = ref<number | null>(null), category = ref<number | null>(null), search = ref('');
const showControls = ref(true), showRecipe = ref(true);
const root = ref<HTMLElement>(), controls = ref<HTMLElement>(), roadmap = ref<InstanceType<typeof CraftRoadmap>>();
const mapHeight = ref(720), controlsHeight = ref(180), narrow = ref(false);
const mapMode = computed(() => tab.value === 'map');
const slotWritable = computed(() => !busy.value && !loading.value && !pending.value);
const blocked = computed(() => !slotWritable.value || slotCommand.busy.value || !!slotCommand.pending.value);
const items = computed(() => new Map(state.value?.items.map(i => [i.id, i]) ?? []));
const linkedItem = computed(() => items.value.get(Number(route.query.item)));
const rawItem = computed(() => linkedItem.value && !state.value?.recipes.some(r => r.item_id === linkedItem.value?.id) ? linkedItem.value : null);
const showItem = computed({get: () => !!rawItem.value, set: open => { if (!open) { const {item, ...query} = route.query; void router.push({path: route.path, query}); } }});
watch([() => route.query.item, () => route.meta.workspaceSection, () => !!state.value], async () => {
  const target = state.value?.recipes.find(r => r.item_id === Number(route.query.item));
  if (target && tab.value === 'map') { selected.value = target.id; showRecipe.value = true; await nextTick(); roadmap.value?.reveal(target.id); }
}, {immediate: true});
const stock = computed(() => new Map(state.value?.inventory.map(i => [i.item_id, i.quantity]) ?? []));
const recipe = computed(() => state.value?.recipes.find(r => r.id === selected.value));
const readyRecipes = computed(() => new Set(state.value?.recipes.filter(r => !craftRequirements(state.value!, r, 1).reasons.length).map(r => r.id) ?? []));
const filtered = computed(() => state.value?.recipes.filter(r => (!category.value || r.category_id === category.value) && items.value.get(r.item_id)?.name.toLowerCase().includes(search.value.trim().toLowerCase())) ?? []);
const craftIcons: Record<string, string> = {'classic-wood': 'tree', 'classic-stone': 'mountain', 'classic-metal': 'hammer', 'classic-textile': 'shirt', 'classic-alchemy': 'flask'};
async function select(id: number) {
  selected.value = id; showRecipe.value = true;
  const item = state.value?.recipes.find(r => r.id === id)?.item_id;
  await router.push({ path: '/world/workspace/map', query: { ...route.query, item: String(item) } });
  if (narrow.value) showControls.value = false;
  await nextTick(); roadmap.value?.reveal(id);
}
function filterCategory(id: number | null) {
  category.value = category.value === id ? null : id;
  if (mapMode.value && category.value) {
    const first = state.value?.recipes.find(r => r.category_id === category.value);
    if (first) { selected.value = first.id; roadmap.value?.reveal(first.id); }
  }
}
const history = ref<CraftEvent[]>([]), historyPages = ref(0), historyError = ref(''), historyLoading = ref(false);
const historyPage = computed({ get: () => workspaceNode(route.query.page) ?? 1, set: page => { void router.push({ path: route.path, query: { ...route.query, page: String(page) } }); } });
let historyRevision = 0;
async function refreshHistory() {
  const revision = ++historyRevision, account = session.value; historyLoading.value = true; historyError.value = '';
  try { const data = await loadCraftHistory(historyPage.value); if (revision === historyRevision && session.value === account) {history.value = data.items; historyPages.value = data.pages;} }
  catch(cause) { if (revision === historyRevision && session.value === account) historyError.value = craftError(cause); }
  finally { if (revision === historyRevision && session.value === account) historyLoading.value = false; }
}
watch([tab, historyPage], () => { if (tab.value === 'history') void refreshHistory(); }, { immediate: true });
watch(session, () => { historyRevision++; history.value = []; historyLoading.value = false; selected.value = null; });
watch(state, value => { if (value && !selected.value) selected.value = value.recipes[0]?.id ?? null; if (tab.value === 'history') void refreshHistory(); });
const actions: Record<string, string> = {craft: 'Изготовление', starter: 'Стартовый набор', gather: 'Сбор сырья', use: 'Использование', discard: 'Удаление', merge: 'Объединение стопок', transfer: 'Перемещение предметов', buy_slots: 'Покупка слотов', repair: 'Ремонт сундука'};
const command = craft.command;
const retry = craft.retry;

function measure() {
  if (!root.value) return;
  const top = Math.max(0, root.value.getBoundingClientRect().top);
  mapHeight.value = Math.max(360, window.innerHeight - top);
  controlsHeight.value = controls.value?.offsetHeight ?? 0;
  narrow.value = window.innerWidth < 760;
}
let observer: ResizeObserver | undefined;
watch([showControls, tab], async () => { await nextTick(); measure(); });
watch(narrow, async () => { await nextTick(); if (mapMode.value) roadmap.value?.reveal(selected.value); });
onMounted(() => {
  void craft.refresh();
  measure();
  observer = new ResizeObserver(measure);
  if (controls.value) observer.observe(controls.value);
  window.addEventListener('resize', measure);
});
onScopeDispose(() => { historyRevision++; observer?.disconnect(); window.removeEventListener('resize', measure); });
</script>
<template lang="pug">
.workshop(ref="root" :class="{'map-mode': mapMode}" :style="{'--map-height': mapHeight + 'px', '--controls-bottom': (showControls ? controlsHeight + 12 : 48) + 'px'}")
  .map-stage(v-if="state && mapMode")
    craft-roadmap(ref="roadmap" :state="state" :selected="selected" :category="category" :top-inset="narrow ? 12 : showControls ? controlsHeight + 12 : 48" :left-inset="narrow ? 12 : showControls ? 204 : 12" :right-inset="narrow ? 12 : showRecipe ? 364 : 24" @select="select")
  .workshop-controls(ref="controls" v-show="showControls || !mapMode")
    world-workspace-hero(:title="pageTitle" :description="pageDescription" :icon="pageIcon" :compact="mapMode" parent-to="/world" parent-label="Вернуться в мир")
      small.slot-stat(v-if="state && tab === 'inventory'") {{ state.slots_used }} / {{ state.slot_limit }} слотов
      router-link(v-if="tab === 'recipes' || mapMode" :to="craftHref") Перейти к изготовлению →
      router-link(v-if="tab === 'inventory'" :to="storageHref") Размещение и хранилища объекта →
      n-button(:theme-overrides="worldActionButtonTheme" v-if="tab === 'inventory' && state?.starter_available" size="small" type="primary" :disabled="blocked" @click="command('starter')") Стартовый набор
    .workspace-navigation
      world-workspace-nav(:node-id="nodeId")
      n-button.hide-controls(v-if="mapMode" quaternary circle size="small" aria-label="Скрыть управление" title="Скрыть управление" @click="showControls = false")
        font-awesome-icon(icon="eye-slash")
  aside.skills(v-if="state && (tab === 'recipes' || mapMode)" v-show="showControls || !mapMode" aria-label="Фильтр по ремеслу")
    .skill(v-for="c in state.categories" :key="c.id" :class="{active: category === c.id}")
      n-popover(trigger="hover")
        template(#trigger)
          button.skill-select(type="button" :aria-pressed="category === c.id" :aria-label="c.name + '. ' + c.description" @click="filterCategory(c.id)")
            font-awesome-icon.skill-icon(:icon="craftIcons[c.code] || 'cube'")
            span
              strong.skill-name {{ c.name }}
              small.skill-numbers
                span Ур. {{ state.skills.find(s => s.category_id === c.id)?.level || 1 }}
                span {{ state.skills.find(s => s.category_id === c.id)?.experience || 0 }} XP
        .craft-description
          strong {{ c.name }}
          p {{ c.description || 'Создавайте предметы этого ремесла, чтобы получать опыт и открывать рецепты.' }}
  .restore-controls(v-if="mapMode && !showControls")
    n-button(:theme-overrides="worldActionButtonTheme" secondary @click="showControls = true")
      font-awesome-icon(icon="eye")
      |  Управление
  .workshop-main(v-if="!mapMode || error || pending || (loading && !state)")
    .workshop-messages(v-if="error || pending || (loading && !state)" :class="{floating: mapMode}")
      n-alert(v-if="error" type="error" role="alert" closable @close="error = ''") {{ error }}
      n-alert(v-if="pending" type="warning")
        p Результат операции пока не подтверждён. Повторная проверка не создаст её заново.
        n-button(:theme-overrides="worldActionButtonTheme" :loading="busy" @click="retry") Проверить результат
      p(v-if="loading && !state" role="status") Загружаем мастерскую…
    template(v-if="state")
      n-alert(v-if="slotCommand.error.value" type="error" role="alert") {{ slotCommand.error.value }}
      n-alert(v-if="slotCommand.pending.value && !slotCommand.busy.value" type="warning")
        p Результат действия ожидает подтверждения.
        n-button(:loading="slotCommand.busy.value" @click="slotCommand.retry") Проверить результат
      section.workshop-content(v-if="tab === 'recipes'" aria-label="Список рецептов")
        n-input(v-model:value="search" placeholder="Название предмета" aria-label="Поиск рецепта")
        .item-grid
          article.list-recipe(v-for="r in filtered" :key="r.id" :class="{ ready: readyRecipes.has(r.id), locked: r.locked_reasons.length > 0, shortage: !readyRecipes.has(r.id) && !r.locked_reasons.length }")
            font-awesome-icon.recipe-lock(v-if="r.locked_reasons.length" icon="lock" title="Рецепт закрыт")
            router-link.item-heading.recipe-select(:to="{ path: '/world/workspace/map', query: { ...(nodeId ? { node: nodeId } : {}), item: r.item_id } }" :aria-label="`Открыть рецепт: ${items.get(r.item_id)?.name}`")
              font-awesome-icon(:icon="items.get(r.item_id)?.icon || 'cube'")
              strong {{ items.get(r.item_id)?.name }}
            strong В наличии: {{ stock.get(r.item_id) || 0 }}
            span(v-if="!readyRecipes.has(r.id)") {{ r.locked_reasons.length ? 'Закрыт' : 'Не хватает ресурсов или оборудования' }}
            small Ур. {{ r.min_level }}
            small Выход: {{ r.output_quantity }} шт.
            router-link(:to="{ path: craftHref, query: { recipe_id: r.id } }") Изготовить →
        p(v-if="!filtered.length") Рецептов по этому фильтру нет.
      craft-inventory.workshop-content(v-if="tab === 'inventory'" :key="session" :state="state" :blocked="blocked" :slot-command="slotCommand" :session="session" :slot-revision="slotRevision" :slot-writable="slotWritable" @command="command" @submit="craft.submit")
      section.workshop-content(v-if="tab === 'history'" aria-label="История крафта")
        world-economy-history(:session="session")
        n-alert(v-if="historyError" type="error") {{ historyError }}
        n-button(:theme-overrides="worldActionButtonTheme" :loading="historyLoading" @click="refreshHistory") Обновить историю
        .history-table
          table
            thead
              tr
                th Операция
                th Предмет
                th Количество
                th кредиты
                th Дата и время
            tbody
              tr(v-for="event in history" :key="event.id")
                td {{ actions[event.action] || event.action }}
                td {{ event.item_id ? items.get(event.item_id)?.name : 'Сырьё' }}
                td {{ event.quantity }}
                td {{ formatCredits(event.credit_change) }}
                td {{ date(event.created_at) }}
        p(v-if="!historyLoading && !history.length") Операций пока нет.
        n-pagination(v-if="historyPages > 1" v-model:page="historyPage" :page-count="historyPages" :disabled="historyLoading" simple)
  template(v-if="state && mapMode")
    craft-recipe-detail.floating-recipe(v-if="recipe && showRecipe" :key="recipe.id" :state="state" :recipe="recipe" :busy="busy" :blocked="blocked" :craft-href="craftHref" @hide="showRecipe = false")
    .restore-recipe(v-if="recipe && !showRecipe")
      n-button(:theme-overrides="worldActionButtonTheme" secondary @click="showRecipe = true")
        font-awesome-icon(icon="eye")
        |  {{ items.get(recipe.item_id)?.name }}
n-modal(:theme-overrides="worldModalTheme" v-model:show="showItem" preset="card" :title="rawItem?.name" :style="{width: 'min(28rem, calc(100vw - 2rem))'}")
  template(v-if="rawItem")
    p {{ rawItem.description }}
    p В наличии: {{ stock.get(rawItem.id) || 0 }}
    p(v-if="rawItem.gather_quantity") Сбор сырья даёт {{ rawItem.gather_quantity }} шт. этого предмета раз в сутки.
    p(v-else) Рецепт этого предмета пока недоступен.
</template>
<style scoped lang="scss">
.workshop:not(.map-mode) { max-width: 1320px; margin-inline: auto; padding: 1.5rem 12px 3rem; gap: 1.25rem; }
.workshop .workshop-controls { width: 100%; display: grid; gap: 1rem; }
.workspace-navigation { display: flex; align-items: start; justify-content: space-between; gap: .75rem; padding: .75rem; border: 1px solid var(--border); border-radius: .8rem; background: var(--bg-surface); }
.workshop:not(.map-mode) .workshop-main { padding: 1.25rem; border: 1px solid var(--border); border-radius: .8rem; background: var(--bg-surface); }
.workshop.map-mode { max-width: none; margin-inline: 0; }
.workshop.map-mode .workshop-controls { width: min(960px, calc(100% - var(--recipe-width) - 36px)); }
.workshop .skill-icon, .workshop .item-heading svg { color: var(--primary); }
.workspace-navigation .hide-controls { position: static; flex-shrink: 0; }
.list-recipe > a:last-child { display: inline-flex; align-self: start; margin-top: auto; padding: .45rem .65rem; border: 1px solid var(--border); border-radius: .4rem; }
.list-recipe > a:last-child:hover { border-color: var(--primary); background: var(--primary-soft); }
.history-table { margin-top: 1.25rem; }
@media(max-width: 760px) { .workshop.map-mode .workshop-controls { width: 100%; }.workshop:not(.map-mode) .workshop-main { padding: 1rem; }.workshop .item-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); } }
.workshop:has(.workshop-main > .workshop-content), .workshop:has(.workshop-main > .craft-inventory) { max-width: 1320px; margin-inline: auto; }
.workshop:not(:has(.skills)) .workshop-main { grid-column: 1 / 4; }
.workshop-intro > a { grid-column: 1 / -1; }
.workshop .workshop-intro { grid-template-columns: minmax(0, 1fr); border-radius: .8rem; }
.workshop { --sidebar-width: 180px; --recipe-width: 340px; position: relative; width: 100%; padding: 0 12px 12px; box-sizing: border-box; display: grid; grid-template-columns: var(--sidebar-width) minmax(0, 1fr) var(--recipe-width); gap: 12px; align-items: start; }
.workshop.map-mode { height: var(--map-height); min-height: 360px; overflow: hidden; display: block; }
.map-stage { position: absolute; inset: 0; }
.skill-numbers { display: flex; gap: .3rem; }
.workshop-controls { grid-column: 1 / 4; grid-row: 1; min-width: 0; width: min(960px, 100%); }
.map-mode .workshop-controls { position: absolute; top: 0; left: 12px; width: min(960px, calc(100% - var(--recipe-width) - 36px)); z-index: 2; max-height: 45%; overflow-y: auto; scrollbar-width: thin; }
.workshop-intro { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 135px; gap: .3rem .6rem; padding: .4rem 2rem .4rem .6rem; border: 1px solid var(--border); border-radius: 0 0 .8rem .8rem; background: linear-gradient(120deg, #34291e, var(--bg-surface) 65%); }
.intro-heading { grid-column: 1; display: flex; align-items: center; flex-wrap: wrap; gap: .2rem .5rem; }.intro-heading h1 { margin: 0; font-size: 1.05rem; }.hide-controls { position: absolute; top: 2px; right: 2px; }.slot-stat { white-space: nowrap; }
.intro-description { grid-column: 1; margin: 0; color: var(--text-muted); font-size: .8rem; }
.intro-actions { grid-column: 1 / -1; display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; }.intro-tools { display: flex; align-items: center; gap: .65rem; margin-left: auto; }
.gather-button { grid-column: 2; grid-row: 1 / 3; align-self: start; border: 1px solid #779b66; border-radius: .45rem; background: #233326; color: #e0f0d9; display: grid; grid-template-columns: auto 1fr; align-items: center; gap: .2rem .35rem; padding: .35rem; cursor: pointer; }.gather-button > svg { font-size: .9rem; }.gather-button strong { font-size: .75rem; }.gather-button span { grid-column: 1 / -1; font-size: .6rem; }.gather-button:disabled { opacity: .65; cursor: default; }
.skills { grid-column: 1; grid-row: 2; display: flex; flex-direction: column; gap: .5rem; min-width: 0; }.map-mode .skills { position: absolute; z-index: 2; left: 12px; top: var(--controls-bottom); width: var(--sidebar-width); max-height: calc(100% - var(--controls-bottom) - 12px); overflow-y: auto; scrollbar-width: thin; }
.skill { flex-shrink: 0; border: 1px solid var(--border); border-radius: .6rem; background: var(--bg-surface); color: var(--text); overflow: hidden; }.skill.active { border-color: var(--primary); background: var(--bg-elevated, #342b21); }.skill-select { display: flex; align-items: center; gap: .7rem; padding: .75rem; cursor: pointer; font: inherit; font-size: .8rem; color: inherit; width: 100%; border: 0; background: transparent; text-align: left; }.skill-select > span { display: grid; gap: .2rem; min-width: 0; overflow-wrap: anywhere; }.skill-icon { font-size: 1.25rem; color: #d6b685; flex-shrink: 0; }
small { color: var(--text-muted); font-size: .75rem; }.craft-description { max-width: 280px; }.craft-description p { margin: .5rem 0 0; }
.workshop-tabs { display: flex; align-items: center; flex-wrap: wrap; gap: .2rem; }.workshop-tabs > button { border: 0; border-radius: .4rem; padding: .4rem .55rem; background: transparent; color: var(--text-muted); cursor: pointer; font: inherit; font-size: .8rem; }.workshop-tabs > button.active { color: var(--primary); background: var(--primary-soft); }
.floating-recipe { position: absolute; z-index: 2; right: 12px; top: 0; width: var(--recipe-width); max-height: calc(100% - 12px); overflow-y: auto; scrollbar-width: thin; box-sizing: border-box; }
.restore-controls, .restore-recipe { position: absolute; top: 0; z-index: 3; }.restore-controls { left: 12px; }.restore-recipe { right: 12px; top: 0; }
.workshop-main { grid-column: 2 / 4; grid-row: 2; display: grid; gap: .75rem; min-width: 0; }.workshop-messages { display: grid; gap: .5rem; }.workshop-messages.floating { position: absolute; z-index: 4; left: 12px; bottom: 12px; max-width: min(440px, calc(100% - 24px)); max-height: 35%; overflow: auto; }
.workshop-content { min-width: 0; }.item-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: .75rem; margin-top: 1rem; }
.list-recipe { position: relative; padding: 1rem; border: 1px solid var(--border); background: var(--bg-surface); border-radius: .6rem; display: flex; flex-direction: column; gap: .6rem; color: var(--text); text-align: left; overflow: hidden; cursor: pointer; }.list-recipe > span { color: var(--text-muted); }.item-heading { display: flex; align-items: center; gap: .6rem; padding-right: 16px; }.item-heading svg { color: #d6b685; flex-shrink: 0; }
.list-recipe.ready { background: linear-gradient(135deg, #2496531f, var(--bg-surface) 80%); }
.list-recipe.shortage { background: linear-gradient(135deg, #d030501a, var(--bg-surface) 80%); }
.list-recipe.locked { background: repeating-linear-gradient(135deg, transparent 0 8px, #ffffff06 8px 16px), var(--bg-surface); }
.recipe-lock { position: absolute; top: .65rem; right: .65rem; color: var(--text-muted); }
.recipe-select { font: inherit; color: inherit; text-align: left; border: 0; background: transparent; padding: 0 16px 0 0; cursor: pointer; }.recipe-select:focus-visible { outline: 2px solid var(--primary); }.list-recipe > .n-button { margin-top: auto; }.list-recipe { cursor: default; }
.history-table { overflow: auto; margin: 1rem 0; }.history-table table { width: 100%; border-collapse: collapse; }.history-table th, .history-table td { text-align: left; padding: .75rem; border-bottom: 1px solid var(--border); white-space: nowrap; }
button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
@media(max-width: 1100px) {
  .intro-heading { align-content: start; }.workshop-tabs > button { padding: .25rem; font-size: .75rem; }
}
@media(max-width: 760px) {
  .workshop, .workshop.map-mode { display: flex; flex-direction: column; height: auto; min-height: 0; overflow: visible; gap: .5rem; }
  .workshop-controls, .map-mode .workshop-controls { position: relative; inset: auto; width: 100%; max-height: none; order: 0; }
  .skills, .map-mode .skills { position: relative; inset: auto; width: 100%; max-height: none; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .25rem; order: 1; }
  .skill-select { flex-direction: row; gap: .3rem; padding: .4rem .25rem; font-size: .7rem; }.skill-icon { font-size: .9rem; }.skill-select .skill-name { display: none; }.skill-numbers { flex-direction: column; gap: .15rem; }.skill-select small { font-size: .6rem; white-space: nowrap; }
  .map-stage { position: relative; inset: auto; width: 100%; height: clamp(240px, 42svh, 420px); flex: none; order: 2; }
  .map-mode .floating-recipe { position: relative; inset: auto; width: 100%; max-height: none; overflow: visible; order: 3; }
  .workshop-main { width: 100%; order: 3; }
  .restore-controls, .restore-recipe { position: relative; inset: auto; order: 0; }.restore-recipe { order: 3; }
  .intro-description { font-size: .7rem; }.slot-stat { font-size: .65rem; }
}
</style>

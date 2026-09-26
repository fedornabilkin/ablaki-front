<script setup lang="ts">
import { computed, ref, watch, onMounted, onScopeDispose, nextTick } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NInput, NPopover, NPagination, NModal } from 'naive-ui';
import { useGatherCountdown } from '@/hooks/useGatherCountdown';
import CraftRoadmap from './CraftRoadmap.vue';
import CraftRecipeDetail from './CraftRecipeDetail.vue';
import CraftInventory from './CraftInventory.vue';
import { useCraftToasts } from '@/hooks/useCraftToasts';
import { useClassicCraft } from '@/hooks/useClassicCraft';
import { loadCraftHistory, craftError, type CraftEvent } from '@/services/api/classicCraft';
import { date } from '@/services/api/portal';
const store = useStore();
const session = computed(() => store.state.auth.revision);
const craft = useClassicCraft(session, () => store.dispatch('auth/fetchData'), computed(() => Number(store.getters['auth/user']?.id)));
const {state, busy, loading, error, notice, pending} = craft;
const countdown = useGatherCountdown(state, craft.refresh);
const route = useRoute(), router = useRouter();
useCraftToasts(notice, session);
const tab = ref('map'), selected = ref<number | null>(null), category = ref<number | null>(null), search = ref('');
const showControls = ref(true), showRecipe = ref(true);
const root = ref<HTMLElement>(), controls = ref<HTMLElement>(), roadmap = ref<InstanceType<typeof CraftRoadmap>>();
const mapHeight = ref(720), controlsHeight = ref(180), narrow = ref(false);
const mapMode = computed(() => tab.value === 'map');
const blocked = computed(() => busy.value || loading.value || !!pending.value);
const items = computed(() => new Map(state.value?.items.map(i => [i.id, i]) ?? []));
const linkedItem = computed(() => items.value.get(Number(route.query.item)));
const rawItem = computed(() => linkedItem.value && !state.value?.recipes.some(r => r.item_id === linkedItem.value?.id) ? linkedItem.value : null);
const showItem = computed({get: () => !!rawItem.value, set: open => { if (!open) { const {item, ...query} = route.query; void router.push({path: route.path, query}); } }});
watch([() => route.query.item, state], async () => {
  const target = state.value?.recipes.find(r => r.item_id === Number(route.query.item));
  if (target) { selected.value = target.id; showRecipe.value = true; tab.value = 'map'; await nextTick(); roadmap.value?.reveal(target.id); }
}, {immediate: true});
const stock = computed(() => new Map(state.value?.inventory.map(i => [i.item_id, i.quantity]) ?? []));
const recipe = computed(() => state.value?.recipes.find(r => r.id === selected.value));
const filtered = computed(() => state.value?.recipes.filter(r => (!category.value || r.category_id === category.value) && items.value.get(r.item_id)?.name.toLowerCase().includes(search.value.trim().toLowerCase())) ?? []);
const tabs = [{id: 'map', name: 'Карта рецептов'}, {id: 'recipes', name: 'Список'}, {id: 'inventory', name: 'Инвентарь'}, {id: 'history', name: 'История'}];
const craftIcons: Record<string, string> = {'classic-wood': 'tree', 'classic-stone': 'mountain', 'classic-metal': 'hammer', 'classic-textile': 'shirt', 'classic-alchemy': 'flask'};
async function select(id: number) {
  selected.value = id; showRecipe.value = true; tab.value = 'map';
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
const history = ref<CraftEvent[]>([]), historyPage = ref(1), historyPages = ref(0), historyError = ref(''), historyLoading = ref(false);
let historyRevision = 0;
async function refreshHistory() {
  const revision = ++historyRevision, account = session.value; historyLoading.value = true; historyError.value = '';
  try { const data = await loadCraftHistory(historyPage.value); if (revision === historyRevision && session.value === account) {history.value = data.items; historyPages.value = data.pages;} }
  catch(cause) { if (revision === historyRevision && session.value === account) historyError.value = craftError(cause); }
  finally { if (revision === historyRevision && session.value === account) historyLoading.value = false; }
}
watch([tab, historyPage], () => { if (tab.value === 'history') void refreshHistory(); });
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
    header.workshop-intro
      .intro-heading
        h1 Мастерская
        small.slot-stat(v-if="state") {{ state.slots_used }} / {{ state.slot_limit }} слотов
        nav.workshop-tabs(aria-label="Разделы мастерской")
          button(v-for="t in tabs" :key="t.id" type="button" :class="{active: tab === t.id}" :aria-current="tab === t.id ? 'page' : undefined" @click="tab = t.id") {{ t.name }}
        n-button.hide-controls(v-if="mapMode" quaternary circle size="small" aria-label="Скрыть управление" title="Скрыть управление" @click="showControls = false")
          font-awesome-icon(icon="eye-slash")
      button.gather-button(type="button" :disabled="blocked || !state?.gather_available" @click="command('gather')")
        font-awesome-icon(:icon="state && !state.gather_available ? 'check-circle' : 'seedling'")
        strong {{ state && !state.gather_available ? 'Сырьё собрано' : 'Собрать сырьё' }}
        span(v-if="state && !state.gather_available && state.gather_available_at") Через {{ countdown }}
        span(v-else) Раз в сутки по московскому времени
      p.intro-description Создавайте материалы, инструменты и станции. Освоенные рецепты открывают новые ветви карты.
      .intro-actions(v-if="state?.starter_available")
        n-button(v-if="state?.starter_available" size="small" type="primary" :disabled="blocked" @click="command('starter')") Стартовый набор
  aside.skills(v-if="state" v-show="showControls || !mapMode" aria-label="Фильтр по ремеслу")
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
    n-button(secondary @click="showControls = true")
      font-awesome-icon(icon="eye")
      |  Управление
  .workshop-main(v-if="!mapMode || error || pending || (loading && !state)")
    .workshop-messages(v-if="error || pending || (loading && !state)" :class="{floating: mapMode}")
      n-alert(v-if="error" type="error" role="alert" closable @close="error = ''") {{ error }}
      n-alert(v-if="pending" type="warning")
        p Результат операции пока не подтверждён. Повторная проверка не создаст её заново.
        n-button(:loading="busy" @click="retry") Проверить результат
      p(v-if="loading && !state" role="status") Загружаем мастерскую…
    template(v-if="state")
      section.workshop-content(v-if="tab === 'recipes'" aria-label="Список рецептов")
        n-input(v-model:value="search" placeholder="Название предмета" aria-label="Поиск рецепта")
        .item-grid
          button.list-recipe(v-for="r in filtered" :key="r.id" @click="select(r.id)")
            span.stock-corner(:class="{available: (stock.get(r.item_id) || 0) > 0}" :aria-label="(stock.get(r.item_id) || 0) > 0 ? 'Есть в инвентаре' : 'Нет в инвентаре'")
              font-awesome-icon(:icon="(stock.get(r.item_id) || 0) > 0 ? 'check' : 'exclamation-circle'")
            .item-heading
              font-awesome-icon(:icon="items.get(r.item_id)?.icon || 'cube'")
              strong {{ items.get(r.item_id)?.name }}
            strong В наличии: {{ stock.get(r.item_id) || 0 }}
            span {{ r.locked_reasons.length ? 'Закрыт' : 'Открыт' }} · Ур. {{ r.min_level }}
        p(v-if="!filtered.length") Рецептов по этому фильтру нет.
      craft-inventory.workshop-content(v-if="tab === 'inventory'" :key="session" :state="state" :blocked="blocked" @command="command" @submit="craft.submit")
      section.workshop-content(v-if="tab === 'history'" aria-label="История крафта")
        n-alert(v-if="historyError" type="error") {{ historyError }}
        n-button(:loading="historyLoading" @click="refreshHistory") Обновить историю
        .history-table
          table
            thead
              tr
                th Операция
                th Предмет
                th Количество
                th Cr
                th Дата и время
            tbody
              tr(v-for="event in history" :key="event.id")
                td {{ actions[event.action] || event.action }}
                td {{ event.item_id ? items.get(event.item_id)?.name : 'Сырьё' }}
                td {{ event.quantity }}
                td {{ event.credit_change }}
                td {{ date(event.created_at) }}
        p(v-if="!historyLoading && !history.length") Операций пока нет.
        n-pagination(v-if="historyPages > 1" v-model:page="historyPage" :page-count="historyPages" :disabled="historyLoading" simple)
  template(v-if="state && mapMode")
    craft-recipe-detail.floating-recipe(v-if="recipe && showRecipe" :key="recipe.id" :state="state" :recipe="recipe" :busy="busy" :blocked="blocked" @craft="(id, qty) => command('craft', id, qty)" @hide="showRecipe = false")
    .restore-recipe(v-if="recipe && !showRecipe")
      n-button(secondary @click="showRecipe = true")
        font-awesome-icon(icon="eye")
        |  {{ items.get(recipe.item_id)?.name }}
n-modal(v-model:show="showItem" preset="card" :title="rawItem?.name" :style="{width: 'min(28rem, calc(100vw - 2rem))'}")
  template(v-if="rawItem")
    p {{ rawItem.description }}
    p В наличии: {{ stock.get(rawItem.id) || 0 }}
    p(v-if="rawItem.gather_quantity") Сбор сырья даёт {{ rawItem.gather_quantity }} шт. этого предмета раз в сутки.
    p(v-else) Рецепт этого предмета пока недоступен.
</template>
<style scoped lang="scss">
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
.stock-corner { position: absolute; top: 0; right: 0; width: 34px; height: 34px; clip-path: polygon(0 0,100% 0,100% 100%); background: #dc2626; }.stock-corner.available { background: #26854e; }.stock-corner svg { position: absolute; right: 4px; top: 4px; font-size: 10px; color: white; }
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

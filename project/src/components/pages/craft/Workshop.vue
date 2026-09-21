<script setup lang="ts">
import { computed, ref, watch, onMounted, onScopeDispose, nextTick } from 'vue';
import { useStore } from 'vuex';
import { NAlert, NButton, NInput, NInputNumber, NSelect, NPopover, NPopconfirm, NPagination } from 'naive-ui';
import CraftRoadmap from './CraftRoadmap.vue';
import CraftRecipeDetail from './CraftRecipeDetail.vue';
import { useClassicCraft } from '@/hooks/useClassicCraft';
import { loadCraftHistory, craftError, type CraftEvent } from '@/services/api/classicCraft';
import { date } from '@/services/api/portal';
const store = useStore();
const session = computed(() => store.state.auth.revision);
const craft = useClassicCraft(session, () => store.dispatch('auth/fetchData'), computed(() => Number(store.getters['auth/user']?.id)));
const {state, busy, loading, error, notice, pending} = craft;
const tab = ref('map'), selected = ref<number | null>(null), category = ref<number | null>(null), search = ref('');
const itemQuantity = ref<number | null>(1);
const showControls = ref(true), showRecipe = ref(true);
const root = ref<HTMLElement>(), controls = ref<HTMLElement>(), roadmap = ref<InstanceType<typeof CraftRoadmap>>();
const mapHeight = ref(720), controlsHeight = ref(260), narrow = ref(false);
const mapMode = computed(() => tab.value === 'map');
const blocked = computed(() => busy.value || loading.value || !!pending.value);
const items = computed(() => new Map(state.value?.items.map(i => [i.id, i]) ?? []));
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
const actions: Record<string, string> = {craft: 'Изготовление', starter: 'Стартовый набор', gather: 'Сбор сырья', use: 'Использование', discard: 'Удаление'};
const rarities: Record<string, string> = {common: 'Обычный', uncommon: 'Необычный', rare: 'Редкий', epic: 'Эпический', legendary: 'Легендарный'};

function measure() {
  if (!root.value) return;
  const top = Math.max(0, root.value.getBoundingClientRect().top);
  mapHeight.value = Math.max(360, window.innerHeight - top - 12);
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
.workshop(ref="root" :class="{'map-mode': mapMode}" :style="{'--map-height': mapHeight + 'px', '--controls-bottom': (showControls ? controlsHeight + 24 : 60) + 'px'}")
  craft-roadmap(v-if="state && mapMode" ref="roadmap" :state="state" :selected="selected" :category="category" :top-inset="showControls ? controlsHeight + 24 : 60" :right-inset="showRecipe && !narrow ? 364 : 24" @select="select")
  .workshop-controls(ref="controls" v-show="showControls || !mapMode")
    .workshop-top
      header.workshop-intro
        .intro-heading
          font-awesome-icon(icon="hammer")
          h1 Мастерская
          n-button(v-if="mapMode" quaternary circle size="small" aria-label="Скрыть управление" title="Скрыть управление" @click="showControls = false")
            font-awesome-icon(icon="eye-slash")
        p Создавайте материалы, инструменты и станции. Освоенные рецепты открывают новые ветви карты.
        .intro-actions
          n-button(v-if="state?.starter_available" size="small" type="primary" :disabled="blocked" @click="craft.command('starter')") Стартовый набор
          n-button(size="small" :loading="loading" :disabled="busy" @click="craft.refresh") Обновить
          small(v-if="state") {{ state.slots_used }} / {{ state.slot_limit }} слотов
      button.gather-button(type="button" :disabled="blocked || !state?.gather_available" @click="craft.command('gather')")
        font-awesome-icon(:icon="state && !state.gather_available ? 'check-circle' : 'seedling'")
        strong {{ state && !state.gather_available ? 'Сырьё собрано' : 'Собрать сырьё' }}
        span Раз в сутки по московскому времени
    .skills(v-if="state" aria-label="Фильтр по ремеслу")
      button.skill.skill-all(type="button" :class="{active: category === null}" :aria-pressed="category === null" @click="filterCategory(null)")
        font-awesome-icon(icon="cubes")
        strong Все ремёсла
      .skill(v-for="c in state.categories" :key="c.id" :class="{active: category === c.id}")
        n-popover(trigger="hover")
          template(#trigger)
            button.skill-select(type="button" :aria-pressed="category === c.id" :aria-label="c.name + '. ' + c.description" @click="filterCategory(c.id)")
              font-awesome-icon.skill-icon(:icon="craftIcons[c.code] || 'cube'")
              span
                strong {{ c.name }}
                small Ур. {{ state.skills.find(s => s.category_id === c.id)?.level || 1 }} · {{ state.skills.find(s => s.category_id === c.id)?.experience || 0 }} XP
          .craft-description
            strong {{ c.name }}
            p {{ c.description || 'Создавайте предметы этого ремесла, чтобы получать опыт и открывать рецепты.' }}
    nav.workshop-tabs(aria-label="Разделы мастерской")
      button(v-for="t in tabs" :key="t.id" type="button" :class="{active: tab === t.id}" :aria-current="tab === t.id ? 'page' : undefined" @click="tab = t.id") {{ t.name }}
      n-select.recipe-search(v-if="state && mapMode" :value="selected" :options="filtered.map(r => ({label: items.get(r.item_id)?.name || r.name, value: r.id}))" filterable placeholder="Найти рецепт" aria-label="Найти рецепт на карте" @update:value="select")
  .restore-controls(v-if="mapMode && !showControls")
    n-button(secondary @click="showControls = true")
      font-awesome-icon(icon="eye")
      |  Управление
  .workshop-messages(v-if="error || pending || notice || (loading && !state)" :class="{floating: mapMode}")
    n-alert(v-if="error" type="error" role="alert" closable @close="error = ''") {{ error }}
    n-alert(v-if="pending" type="warning")
      p Результат операции пока не подтверждён. Повторная проверка не создаст её заново.
      n-button(:loading="busy" @click="craft.retry") Проверить результат
    n-alert(v-if="notice" type="success" role="status" closable @close="notice = ''") {{ notice }}
    p(v-if="loading && !state" role="status") Загружаем мастерскую…
  template(v-if="state")
    craft-recipe-detail.floating-recipe(v-if="mapMode && recipe && showRecipe" :key="recipe.id" :state="state" :recipe="recipe" :busy="busy" :blocked="blocked" @craft="(id, qty) => craft.command('craft', id, qty)" @hide="showRecipe = false")
    .restore-recipe(v-if="mapMode && recipe && !showRecipe")
      n-button(secondary @click="showRecipe = true")
        font-awesome-icon(icon="eye")
        |  {{ items.get(recipe.item_id)?.name }}
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
    section.workshop-content(v-if="tab === 'inventory'" aria-label="Инвентарь")
      label.inventory-quantity Количество для использования или удаления
        n-input-number(v-model:value="itemQuantity" :min="1" :max="100" :precision="0" :disabled="blocked")
      .item-grid
        article.inventory-item(v-for="slot in state.inventory" :key="slot.item_id")
          .item-meta
            font-awesome-icon(:icon="items.get(slot.item_id)?.icon || 'cube'")
            small {{ rarities[items.get(slot.item_id)?.rarity || 'common'] }}
          h3 {{ items.get(slot.item_id)?.name }}
          strong × {{ slot.quantity }}
          small(v-if="!items.get(slot.item_id)?.active") Отключён администратором
          p(v-if="items.get(slot.item_id)?.use_xp") +{{ items.get(slot.item_id)?.use_xp }} XP за использование
          .item-actions
            n-button(v-if="items.get(slot.item_id)?.use_xp" size="small" :disabled="blocked || !itemQuantity || itemQuantity > slot.quantity || !items.get(slot.item_id)?.active" @click="craft.command('use', slot.item_id, itemQuantity || 0)") Использовать
            n-popconfirm(v-if="items.get(slot.item_id)?.destroyable" @positive-click="craft.command('discard', slot.item_id, itemQuantity || 0)")
              template(#trigger)
                n-button.discard-button(quaternary circle size="small" :aria-label="'Удалить ' + items.get(slot.item_id)?.name" title="Удалить" :disabled="blocked || !itemQuantity || itemQuantity > slot.quantity")
                  font-awesome-icon(icon="trash-alt")
              | Удалить {{ itemQuantity }} шт. «{{ items.get(slot.item_id)?.name }}»? Предметы будут потеряны.
      p(v-if="!state.inventory.length") Инвентарь пуст. Получите стартовый набор или соберите сырьё.
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
</template>
<style scoped lang="scss">
.workshop { position: relative; width: 100%; padding: 12px; box-sizing: border-box; display: grid; gap: 1rem; }
.workshop.map-mode { height: var(--map-height); min-height: 360px; overflow: hidden; display: block; }
.workshop-controls { display: grid; gap: .65rem; }
.map-mode .workshop-controls { position: absolute; top: 12px; left: 12px; right: 12px; z-index: 2; max-height: 48%; overflow-y: auto; scrollbar-width: thin; }
.workshop-top { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: .65rem; }
.workshop-intro { padding: 1rem 1.25rem; border: 1px solid var(--border); border-radius: .8rem; background: linear-gradient(120deg, #34291e, var(--bg-surface) 65%); }
.intro-heading, .intro-actions { display: flex; align-items: center; gap: .65rem; }.intro-heading > svg { color: #d6b685; font-size: 1.25rem; }.intro-heading h1 { flex: 1; margin: 0; font-size: 1.35rem; }.intro-actions { flex-wrap: wrap; margin-top: .65rem; }
.workshop-intro p { color: var(--text-muted); margin: .4rem 0 0; font-size: .85rem; }
.gather-button { border: 1px solid #779b66; border-radius: .8rem; background: #233326; color: #e0f0d9; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .45rem; padding: 1rem; cursor: pointer; }.gather-button > svg { font-size: 1.65rem; }.gather-button strong { font-size: 1.1rem; }.gather-button span { font-size: .75rem; }.gather-button:disabled { opacity: .65; cursor: default; }
.skills { display: flex; flex-wrap: wrap; gap: .5rem; }.skill { flex: 1 1 140px; border: 1px solid var(--border); border-radius: .6rem; background: var(--bg-surface); color: var(--text); overflow: hidden; }.skill.active { border-color: var(--primary); background: var(--bg-elevated, #342b21); }.skill-select, .skill-all { display: flex; align-items: center; gap: .7rem; padding: .6rem .75rem; cursor: pointer; font: inherit; font-size: .8rem; color: inherit; }.skill-select { width: 100%; height: 100%; border: 0; background: transparent; text-align: left; }.skill-select > span { display: grid; gap: .2rem; }.skill-icon { font-size: 1.25rem; color: #d6b685; }.skill-all { flex: 0 1 145px; }
small { color: var(--text-muted); font-size: .75rem; }.craft-description { max-width: 280px; }.craft-description p { margin: .5rem 0 0; }
.workshop-tabs { display: flex; align-items: center; flex-wrap: wrap; gap: .35rem; padding: .5rem; border: 1px solid var(--border); border-radius: .6rem; background: var(--bg-surface); }.workshop-tabs > button { border: 0; border-radius: .4rem; padding: .6rem .8rem; background: transparent; color: var(--text-muted); cursor: pointer; font: inherit; font-size: .8rem; }.workshop-tabs > button.active { color: var(--primary); background: var(--primary-soft); }.recipe-search { width: 240px; margin-left: auto; }
.floating-recipe { position: absolute; z-index: 2; right: 12px; top: var(--controls-bottom); width: 340px; max-height: calc(100% - var(--controls-bottom) - 12px); overflow-y: auto; scrollbar-width: thin; box-sizing: border-box; }
.restore-controls, .restore-recipe { position: absolute; top: 12px; z-index: 3; }.restore-controls { left: 12px; }.restore-recipe { right: 12px; top: var(--controls-bottom); }
.workshop-messages { display: grid; gap: .5rem; }.workshop-messages.floating { position: absolute; z-index: 4; left: 12px; bottom: 12px; max-width: min(440px, calc(100% - 24px)); max-height: 35%; overflow: auto; }
.workshop-content { padding: .5rem; }.item-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: .75rem; margin-top: 1rem; }
.inventory-item, .list-recipe { position: relative; padding: 1rem; border: 1px solid var(--border); background: var(--bg-surface); border-radius: .6rem; display: flex; flex-direction: column; gap: .6rem; color: var(--text); text-align: left; overflow: hidden; }.list-recipe { cursor: pointer; }.list-recipe > span { color: var(--text-muted); }.item-heading, .item-meta { display: flex; align-items: center; gap: .6rem; }.item-heading { padding-right: 16px; }.item-heading svg, .item-meta svg { color: #d6b685; flex-shrink: 0; }.inventory-item h3 { font-size: 1rem; margin: 0; }.inventory-item p { margin: 0; }
.stock-corner { position: absolute; top: 0; right: 0; width: 34px; height: 34px; clip-path: polygon(0 0,100% 0,100% 100%); background: #dc2626; }.stock-corner.available { background: #26854e; }.stock-corner svg { position: absolute; right: 4px; top: 4px; font-size: 10px; color: white; }
.item-actions { display: flex; align-items: center; gap: .5rem; margin-top: auto; padding-top: .4rem; }.discard-button { margin-left: auto; color: #ef4444; }
.inventory-quantity { display: grid; gap: .4rem; max-width: 340px; font-size: .8rem; }.history-table { overflow: auto; margin: 1rem 0; }.history-table table { width: 100%; border-collapse: collapse; }.history-table th, .history-table td { text-align: left; padding: .75rem; border-bottom: 1px solid var(--border); white-space: nowrap; }
button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
@media(max-width: 760px) {
  .workshop-top { grid-template-columns: minmax(0, 1fr) 150px; }.workshop-intro { padding: .8rem; }.intro-heading h1 { font-size: 1.1rem; }.gather-button { padding: .6rem; }.gather-button strong { font-size: .9rem; }
  .skills { gap: .35rem; }.skill { flex-basis: 120px; }.skill-select, .skill-all { padding: .45rem; }.recipe-search { width: 100%; }.workshop-tabs > button { padding: .45rem; }
  .floating-recipe { top: auto; bottom: 12px; max-height: 48%; width: min(340px, calc(100% - 24px)); }.workshop-messages.floating { max-width: calc(100% - 24px); }.workshop-intro p { font-size: .75rem; }
}
</style>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onScopeDispose, nextTick } from 'vue';
import { useStore } from 'vuex';
import { NAlert, NButton, NInput, NInputNumber, NSelect, NTabs, NTabPane, NPopconfirm, NPagination } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import CraftRoadmap from './CraftRoadmap.vue';
import { useClassicCraft } from '@/hooks/useClassicCraft';
import { craftRequirements, maxCraftQuantity } from '@/entities/craft/classic';
import { loadCraftHistory, craftError, type CraftEvent } from '@/services/api/classicCraft';
import { date } from '@/services/api/portal';
const store = useStore();
const session = computed(() => store.state.auth.revision);
const craft = useClassicCraft(session, () => store.dispatch('auth/fetchData'), computed(() => Number(store.getters['auth/user']?.id)));
const {state, busy, loading, error, notice, pending} = craft;
const tab = ref('map'), selected = ref<number | null>(null), category = ref<number | null>(null), search = ref(''), quantity = ref<number | null>(1);
const itemQuantity = ref<number | null>(1);
const blocked = computed(() => busy.value || loading.value || !!pending.value);
const items = computed(() => new Map(state.value?.items.map(i => [i.id, i]) ?? []));
const recipe = computed(() => state.value?.recipes.find(r => r.id === selected.value));
const requirements = computed(() => state.value && recipe.value ? craftRequirements(state.value, recipe.value, quantity.value ?? 0) : null);
const categories = computed(() => state.value?.categories.map(c => ({label: c.name, value: c.id})) ?? []);
const filtered = computed(() => state.value?.recipes.filter(r => (!category.value || r.category_id === category.value) && (items.value.get(r.item_id)?.name.toLowerCase().includes(search.value.toLowerCase()))) ?? []);
const detail = ref<HTMLElement>();
async function select(id: number) { selected.value = id; quantity.value = 1; await nextTick(); if (window.matchMedia('(max-width: 1000px)').matches) detail.value?.scrollIntoView({behavior: 'smooth', block: 'start'}); }
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
onMounted(craft.refresh);
onScopeDispose(() => { historyRevision++; });
</script>
<template lang="pug">
page-header(page-title="Мастерская")
.container.page.workshop
  .workshop-intro
    div
      .eyebrow РЕМЕСЛО И ОТКРЫТИЯ
      h2 От первых досок до своей кузницы
      p Создавайте материалы, инструменты и станции. Выполненные рецепты открывают новые ветви карты.
    .workshop-balance(v-if="state")
      span Общий счёт
      strong {{ state.credit.toLocaleString('ru-RU') }} Cr
      small Инвентарь: {{ state.slots_used }} / {{ state.slot_limit }} слотов
  .workshop-actions
    n-button(type="primary" :disabled="blocked || !state?.starter_available" @click="craft.command('starter')") Стартовый набор
    n-button(:disabled="blocked || !state?.gather_available" @click="craft.command('gather')") Собрать сырьё на сегодня
    n-button(:loading="loading" :disabled="busy" @click="craft.refresh") Обновить
  p.hint Стартовый набор выдаётся один раз. Сбор сырья доступен раз в сутки по московскому времени. Крафт происходит сразу.
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-alert(v-if="pending" type="warning")
    p Результат последней операции пока не подтверждён. Повторите проверку с тем же ключом: повторного списания не будет.
    n-button(:loading="busy" @click="craft.retry") Проверить результат
  n-alert(v-if="notice" type="success" role="status") {{ notice }}
  p(v-if="loading && !state" role="status") Загружаем мастерскую…
  template(v-if="state")
    .skills
      .skill(v-for="c in state.categories" :key="c.id")
        strong {{ c.name }}
        span Ур. {{ state.skills.find(s => s.category_id === c.id)?.level || 1 }} · {{ state.skills.find(s => s.category_id === c.id)?.experience || 0 }} XP
    n-tabs(v-model:value="tab" type="line" animated)
      n-tab-pane(name="map" tab="Карта рецептов")
        .workshop-filters
          n-select(v-model:value="category" :options="categories" clearable placeholder="Все ремёсла" aria-label="Ремесло")
          n-select(:value="selected" :options="state.recipes.map(r => ({label: items.get(r.item_id)?.name || r.name, value: r.id}))" filterable placeholder="Найти рецепт на карте" aria-label="Найти рецепт на карте" @update:value="select")
        .workshop-layout
          craft-roadmap(:state="state" :selected="selected" :category="category" @select="select")
          aside.recipe-detail(v-if="recipe && requirements" ref="detail" aria-label="Выбранный рецепт")
            font-awesome-icon.detail-icon(:icon="items.get(recipe.item_id)?.icon || 'cube'")
            h3 {{ items.get(recipe.item_id)?.name }}
            p {{ recipe.description }}
            p Выход: {{ recipe.output_quantity }} шт. · +{{ recipe.experience }} XP за партию
            p(v-if="recipe.station_id") Станция: {{ state.stations.find(s => s.id === recipe.station_id)?.name || 'недоступна' }}
            label Количество партий
              n-input-number(v-model:value="quantity" :min="1" :max="100" :precision="0" :disabled="blocked")
            n-button(size="small" :disabled="blocked || maxCraftQuantity(state, recipe) === 0" @click="quantity = maxCraftQuantity(state, recipe)") Максимум по ресурсам: {{ maxCraftQuantity(state, recipe) }}
            ul.resource-list
              li(v-for="r in requirements.resources" :key="r.id" :class="{shortage: r.have < r.needed}")
                span {{ r.name }}{{ r.retained ? ' (1 сохраняется)' : '' }}
                strong {{ r.have }} / {{ r.needed }}
            p Стоимость: {{ requirements.cost }} Cr · Результат: {{ recipe.output_quantity * (quantity || 0) }} шт.
            ul.hint(v-if="requirements.reasons.length")
              li(v-for="reason in requirements.reasons" :key="reason") {{ reason }}
            n-button(type="primary" block :loading="busy" :disabled="blocked || !!requirements.reasons.length" @click="craft.command('craft', recipe.id, quantity || 0)") Создать
            small.hint Станции и инструменты остаются в инвентаре.
      n-tab-pane(name="recipes" tab="Список")
        .workshop-filters
          n-input(v-model:value="search" placeholder="Название предмета" aria-label="Поиск рецепта")
          n-select(v-model:value="category" :options="categories" clearable placeholder="Все ремёсла")
        .item-grid
          button.list-recipe(v-for="r in filtered" :key="r.id" @click="select(r.id); tab = 'map'")
            font-awesome-icon(:icon="items.get(r.item_id)?.icon || 'cube'")
            strong {{ items.get(r.item_id)?.name }}
            span {{ r.locked_reasons.length ? 'Закрыт' : 'Открыт' }} · Ур. {{ r.min_level }}
        p(v-if="!filtered.length") Рецептов по этому фильтру нет.
      n-tab-pane(name="inventory" tab="Инвентарь")
        p.hint Снаряжение и изделия хранятся в инвентаре. Экипировка для боя появится отдельно. Расходники дают опыт своего ремесла.
        label.inventory-quantity Количество для использования или удаления
          n-input-number(v-model:value="itemQuantity" :min="1" :max="100" :precision="0" :disabled="blocked")
        .item-grid
          article.inventory-item(v-for="slot in state.inventory" :key="slot.item_id")
            font-awesome-icon(:icon="items.get(slot.item_id)?.icon || 'cube'")
            h3 {{ items.get(slot.item_id)?.name }}
            strong × {{ slot.quantity }}
            small {{ rarities[items.get(slot.item_id)?.rarity || 'common'] }}
            small(v-if="!items.get(slot.item_id)?.active") Отключён администратором
            p(v-if="items.get(slot.item_id)?.use_xp") +{{ items.get(slot.item_id)?.use_xp }} XP за использование
            .item-actions
              n-button(v-if="items.get(slot.item_id)?.use_xp" size="small" :disabled="blocked || !itemQuantity || itemQuantity > slot.quantity || !items.get(slot.item_id)?.active" @click="craft.command('use', slot.item_id, itemQuantity || 0)") Использовать
              n-popconfirm(v-if="items.get(slot.item_id)?.destroyable" @positive-click="craft.command('discard', slot.item_id, itemQuantity || 0)")
                template(#trigger)
                  n-button(size="small" :disabled="blocked || !itemQuantity || itemQuantity > slot.quantity") Удалить
                | Удалить {{ itemQuantity }} шт. «{{ items.get(slot.item_id)?.name }}»? Предметы будут потеряны.
        p(v-if="!state.inventory.length") Инвентарь пуст. Получите стартовый набор или соберите сырьё.
      n-tab-pane(name="history" tab="История")
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
.workshop { display: grid; gap: 1rem; padding-bottom: 2rem; }
.workshop-intro { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; padding: 1.5rem; border: 1px solid var(--border); border-radius: .75rem; background: linear-gradient(120deg, #34291e, var(--bg-surface) 65%); }
.eyebrow { font-size: .7rem; letter-spacing: .14em; color: #d6b685; }
h2 { margin: .5rem 0; font-size: clamp(1.2rem, 3vw, 1.7rem); } h3 { margin: .4rem 0; }
.workshop-intro p { max-width: 640px; color: var(--text-muted); margin-bottom: 0; }
.workshop-balance { display: grid; gap: .25rem; align-content: center; } .workshop-balance strong { font-size: 1.5rem; color: var(--primary); }
.workshop-actions, .skills, .item-actions { display: flex; flex-wrap: wrap; gap: .6rem; }
.hint, small { color: var(--text-muted); font-size: .8rem; } .hint { margin: 0; }
.skill { display: grid; flex: 1; min-width: 150px; gap: .3rem; background: var(--bg-surface); padding: .8rem; border-radius: .5rem; font-size: .8rem; }
.skill span { color: var(--text-muted); }
.workshop-filters { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; margin-bottom: 1rem; }
.workshop-layout { display: grid; grid-template-columns: minmax(0, 1fr) 290px; gap: 1rem; align-items: start; }
.recipe-detail { background: var(--bg-surface); border: 1px solid var(--border); border-radius: .75rem; padding: 1rem; display: grid; gap: .65rem; font-size: .85rem; }
.recipe-detail p { margin: 0; } .detail-icon { font-size: 2rem; color: #d6b685; }
.resource-list { list-style: none; padding: 0; margin: 0; display: grid; gap: .5rem; } .resource-list li { display: flex; justify-content: space-between; gap: .5rem; }.shortage { color: #ffb18a; }
.item-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: .75rem; margin-top: 1rem; }
.inventory-item, .list-recipe { padding: 1rem; border: 1px solid var(--border); background: var(--bg-surface); border-radius: .5rem; display: grid; gap: .6rem; color: var(--text); text-align: left; }
.inventory-item h3 { font-size: 1rem; }.inventory-item p { margin: 0; }.list-recipe { cursor: pointer; }.list-recipe:focus-visible { outline: 2px solid var(--primary); }.list-recipe span { color: var(--text-muted); }
.inventory-quantity { display: grid; gap: .4rem; max-width: 340px; margin-top: 1rem; font-size: .8rem; }
.history-table { overflow: auto; margin: 1rem 0; }.history-table table { width: 100%; border-collapse: collapse; }.history-table th, .history-table td { text-align: left; padding: .75rem; border-bottom: 1px solid var(--border); white-space: nowrap; }
@media(max-width: 1000px) { .workshop-layout { grid-template-columns: 1fr; } }
@media(max-width: 600px) { .workshop-filters { grid-template-columns: 1fr; }.workshop-intro { padding: 1rem; }.workshop-actions .n-button { flex: 1 1 auto; } }
</style>

<script setup lang="ts">
import WorldPanel from './WorldPanel.vue';
import WorldSectionHeading from './WorldSectionHeading.vue';
import WorldDisclosure from './WorldDisclosure.vue';
import ChoiceButtons from '@/components/ChoiceButtons.vue';
import { worldActionButtonTheme } from '@/entities/world/theme';
import { creditCost } from '@/entities/world/credits';
import { projectCraftTerms } from '@/entities/world/craftPreview';
import WorldPaymentSources from './WorldPaymentSources.vue';
import WorldHelpHint from './WorldHelpHint.vue';
import WorldQuotaNotice from './WorldQuotaNotice.vue';
import WorldCredits from './WorldCredits.vue';
import type { CraftResult } from '@/entities/world/types';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NInput, NInputNumber, NSelect, NSpin } from 'naive-ui';
import WorldWorkspaceHero from './WorldWorkspaceHero.vue';
import WorldWorkspaceNav from './WorldWorkspaceNav.vue';
import { useWorldCommand } from '@/hooks/useWorldCommand';
import { useWorldPresence } from '@/hooks/useWorldPresence';
import { worldError } from '@/services/api/world';
import { useCampsiteCraft } from '@/hooks/useCampsiteCraft';
import { loadWorkspace, previewWorkspace, type WorkspaceInput } from '@/services/api/worldWorkspace';
const route = useRoute(), router = useRouter(), auth = useStore();
const actionTheme = computed(() => route.path.startsWith('/world/') ? worldActionButtonTheme : undefined);
const nodeId = computed(() => Number(route.params.id ?? route.query.node));
const session = computed(() => Number(auth.state.auth.revision)), owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0));
const craftHref = useCampsiteCraft(session);
const state = shallowRef<Awaited<ReturnType<typeof loadWorkspace>> | null>(null), loading = ref(false), calculating = ref(false), error = ref(''), notice = ref('');
useWorldPresence(computed(() => state.value?.writable && state.value.node_id === nodeId.value ? nodeId.value : null), session, { enter: false });
const recipe = ref<number | null>(null), quantity = ref<number | null>(1), sources = ref<number[]>([]), output = ref<number | null>(null), equipment = ref<Record<number, number | null>>({});
const search = ref('');
const category = ref('all'), availability = ref('all');
const categoryIcons: Record<string, string> = { 'Деревообработка': 'tree', 'Ткачество': 'shirt', 'Каменное дело': 'mountain', 'Кузнечное дело': 'hammer', 'Алхимия': 'flask', 'Огород': 'seedling' };
const categories = computed(() => [{value: 'all', label: 'Все группы', icon: 'cubes'}, ...[...new Set(state.value?.recipes.map(r => r.category ?? 'Прочее') ?? [])].map(name => ({value: name, label: name, icon: categoryIcons[name] || state.value?.recipes.find(r => (r.category ?? 'Прочее') === name)?.icon || 'cube'}))]);
const availabilityOptions = [{value: 'all', label: 'Все'}, {value: 'ready', label: 'Хватает ресурсов'}, {value: 'shortage', label: 'Не хватает ресурсов'}, {value: 'locked', label: 'Закрытые'}];
const lastResult = ref<CraftResult | null>(null);
const useObjectBudget = ref(false);
const waitingForPreview = ref(false);
const calculation = shallowRef<(Awaited<ReturnType<typeof previewWorkspace>> & { input: WorkspaceInput }) | null>(null);
let generation = 0, previewGeneration = 0, disposed = false;
let previewTimer: ReturnType<typeof setTimeout> | undefined;
const command = useWorldCommand(session, owner, result => { lastResult.value = result.craft_result ?? null; notice.value = lastResult.value ? 'Изготовление завершено.' : 'Предыдущее действие подтверждено. Можно продолжить изготовление.'; void auth.dispatch('auth/fetchData'); void load(recipe.value ?? undefined); });
const { busy, pending, error: commandError } = command;
const blocked = computed(() => busy.value || !!pending.value || loading.value || calculating.value || waitingForPreview.value || !state.value?.writable || (state.value?.quota && (quantity.value ?? 0) > state.value.quota.remaining));
const displayedTerms = computed(() => calculation.value && calculation.value.input.recipe_id === recipe.value
  ? projectCraftTerms(calculation.value.terms, calculation.value.input.quantity, quantity.value ?? 0) : null);
const selectedRecipe = computed(() => state.value?.recipes.find(r => r.id === recipe.value));
const storageOptions = computed(() => state.value?.storages.map(s => ({ label: `${s.name} №${s.id}`, value: s.id })) ?? []);
const outputOptions = computed(() => state.value?.storages.filter(s => s.output_allowed).map(s => ({ label: `${s.name} №${s.id}`, value: s.id })) ?? []);
const filteredRecipes = computed(() => state.value?.recipes.filter(r => r.name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())
  && (category.value === 'all' || (r.category ?? 'Прочее') === category.value)
  && (availability.value === 'all' || availability.value === 'ready' && r.available && !r.locked_reasons.length || availability.value === 'shortage' && !r.available && !r.locked_reasons.length || availability.value === 'locked' && r.locked_reasons.length)) ?? []);
const exposure: Record<string, string> = { outdoor: 'на улице', covered: 'под навесом', indoor: 'в помещении', carried: 'в рюкзаке' };
function invalidate(clear = false) { clearTimeout(previewTimer); previewGeneration++; if (clear) calculation.value = null; calculating.value = false; waitingForPreview.value = false; }
function schedulePreview() { invalidate(); if (loading.value || disposed || selectedRecipe.value?.locked_reasons.length) return; waitingForPreview.value = true; previewTimer = setTimeout(() => { void preview(); }, 600); }
watch([quantity, sources, output, equipment, useObjectBudget], schedulePreview, { deep: true, flush: 'sync' });
async function load(selected?: number) {
  const current = ++generation; invalidate(true); error.value = ''; loading.value = true;
  if (!Number.isSafeInteger(nodeId.value) || nodeId.value < 1 || nodeId.value > 2147483647) { error.value = 'Некорректный адрес мастерской.'; loading.value = false; return; }
  try {
    const value = await loadWorkspace(nodeId.value, selected); if (disposed || generation !== current) return;
    state.value = value; recipe.value = value.recipe_id;
    sources.value = sources.value.filter(id => value.storages.some(s => s.id === id));
    if (!sources.value.length) sources.value = value.storages.slice(0, 20).map(s => s.id);
    if (!value.storages.some(s => s.id === output.value && s.output_allowed)) output.value = value.storages.find(s => s.kind === 'backpack' && s.output_allowed)?.id ?? value.storages.find(s => s.output_allowed)?.id ?? null;
    equipment.value = Object.fromEntries(value.equipment.map(e => [e.item_id, e.candidates.some(c => c.instance_id === equipment.value[e.item_id]) ? equipment.value[e.item_id] : e.candidates[0]?.instance_id ?? null]));
  } catch (cause) { if (generation === current && !disposed) { state.value = null; error.value = worldError(cause); } }
  finally { if (generation === current && !disposed) { loading.value = false; if (!error.value) schedulePreview(); } }
}
function materialRecipe(item: number) { return selectedRecipe.value?.materials?.find(material => material.item_id === item)?.recipe_id ?? null; }
function recipeLink(value: number) { return { path: route.path, query: { ...route.query, recipe_id: String(value) }, hash: route.hash }; }
function changeRecipe(value: number) { if (busy.value || loading.value) return; void router.push(recipeLink(value)); }
async function retryPending() {
  const result = await command.retry();
  // A definitive rejection (for example an expired quote) clears the pending
  // request too. Recalculate the current recipe so the form does not stay blocked.
  if (!result && !pending.value && !disposed) await load(recipe.value ?? undefined);
}
async function preview() {
  waitingForPreview.value = false;
  if (busy.value || pending.value || loading.value || !state.value?.writable || !recipe.value || !output.value || !Number.isSafeInteger(quantity.value) || !quantity.value || quantity.value < 1 || quantity.value > 100 || selectedRecipe.value?.locked_reasons.length) { calculation.value = null; return; }
  if (!sources.value.length || sources.value.length > 20 || state.value.equipment.some(e => !equipment.value[e.item_id])) { calculation.value = null; return; }
  const input: WorkspaceInput = { node_id: nodeId.value, recipe_id: recipe.value, quantity: quantity.value, source_storage_ids: [...sources.value], output_storage_id: output.value, equipment_instance_ids: state.value.equipment.map(e => equipment.value[e.item_id] as number).sort((a, b) => a - b) };
  if (useObjectBudget.value && displayedTerms.value?.price !== '0.0000') input.use_object_budget = true;
  const current = ++previewGeneration; calculating.value = true; error.value = '';
  try { const result = await previewWorkspace(input); if (!disposed && current === previewGeneration) calculation.value = { ...result, input }; }
  catch (cause) { if (!disposed && current === previewGeneration) { calculation.value = null; error.value = worldError(cause); } }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
async function craft() {
  if (!calculation.value || blocked.value || calculation.value.terms.reasons.length) return;
  const shown = calculation.value, current = ++previewGeneration;
  calculating.value = true; error.value = '';
  try {
    const fresh = await previewWorkspace(shown.input);
    if (disposed || current !== previewGeneration) return;
    calculation.value = { ...fresh, input: shown.input };
    if (JSON.stringify(fresh.terms) !== JSON.stringify(shown.terms)) { error.value = 'Условия изготовления изменились. Проверьте обновлённую стоимость и материалы.'; return; }
    await command.submit('/workspace/craft', { ...shown.input }, fresh.quote);
  } catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
watch([nodeId, session, owner], () => { state.value = null; sources.value = []; output.value = null; equipment.value = {}; recipe.value = null; search.value = ''; }, { flush: 'sync' });
watch([nodeId, session, owner, () => route.query.recipe_id], () => { notice.value = ''; lastResult.value = null; const requested = Number(route.query.recipe_id); void load(Number.isSafeInteger(requested) && requested > 0 ? requested : undefined); }, { immediate: true, flush: 'sync' });
onScopeDispose(() => { disposed = true; generation++; invalidate(); });
</script>
<template lang="pug">
.container.workspace
  world-workspace-hero(:title="state ? `Изготовление: ${state.name}` : 'Изготовление в объекте'" :parent-to="`/world/nodes/${nodeId}`")
    router-link(v-if="!state && craftHref !== route.path" :to="{ path: craftHref, query: route.query }") Изготовление на своей стоянке
  .workspace-navigation
    world-workspace-nav(:node-id="nodeId" manufacturing)
  n-alert(closable v-if="commandError || error" type="error" role="alert") {{ commandError || error }}
  n-alert(v-if="pending && !busy" type="info" role="status")
    p Предыдущее действие не подтверждено. Проверьте его результат, чтобы продолжить изготовление. Повтор использует тот же запрос и не дублирует результат.
    n-button(:theme-overrides="actionTheme" :loading="busy" @click="retryPending") Проверить предыдущее действие
  n-spin(v-if="loading && !state" aria-label="Загрузка мастерской")
  template(v-if="state")
    n-alert(closable v-if="!state.writable" type="info") Мастерская временно доступна только для просмотра.
    .workspace-layout
      world-panel.recipe-catalog(aria-label="Рецепты мастерской")
        world-section-heading.recipe-heading(title="Рецепты объекта" icon="scroll")
          world-help-hint(label="Как изготовить предмет")
            p Выберите рецепт. Материалы и оборудование подберутся автоматически. Проверьте расход ресурсов и нажмите «Изготовить».
        n-input.recipe-search(v-model:value="search" clearable placeholder="Найти рецепт" aria-label="Найти рецепт")
          template(#prefix)
            font-awesome-icon(icon="search" aria-hidden="true")
        world-disclosure.recipe-filters(label="Фильтры рецептов" icon="list-check" :indicator="category !== 'all' || availability !== 'all' ? 'Выбраны' : undefined")
          choice-buttons(v-model="category" :options="categories" label="Группа предметов" mobile-icons)
          choice-buttons(v-model="availability" :options="availabilityOptions" label="Доступность изготовления")
        .recipe-tiles
          .recipe-tile-wrap(v-for="entry in filteredRecipes" :key="entry.id")
            button.recipe-tile(type="button" :class="{ selected: recipe === entry.id, ready: entry.available && !entry.locked_reasons.length, shortage: !entry.available && !entry.locked_reasons.length, locked: entry.locked_reasons.length }" :aria-pressed="recipe === entry.id" :disabled="busy || loading" @click="changeRecipe(entry.id)")
              font-awesome-icon(:icon="entry.icon || 'cube'" aria-hidden="true")
              strong {{ entry.name }}
              small ×{{ entry.quantity }} за партию
              span.recipe-ingredients(v-if="entry.materials?.length")
                span(v-for="material in entry.materials" :key="material.item_id" :class="{ missing: !material.available }") {{ material.name }} × {{ material.quantity }}
              span(v-if="entry.locked_reasons.length")
                font-awesome-icon(icon="lock" aria-hidden="true")
                |  Закрыто
              span(v-else-if="!entry.available") Не хватает ресурсов
            world-help-hint.recipe-lock-info(v-if="entry.locked_reasons.length" :label="`Как открыть ${entry.name}`" symbol="i")
              strong Как открыть изготовление
              p(v-for="reason in entry.locked_reasons" :key="reason") {{ reason }}
              p Выполните указанные условия и обновите мастерскую.
        p(v-if="!filteredRecipes.length") Рецептов по этому запросу нет.
      world-panel.craft-command(as="aside" aria-label="Изготовление выбранного предмета" aria-live="polite")
        world-quota-notice(v-if="state.quota" :quota="state.quota" :requested="quantity ?? 1" :server-time="state.server_time")
        template(v-if="selectedRecipe")
          .selected-heading
            font-awesome-icon(:icon="selectedRecipe.icon || 'cube'" aria-hidden="true")
            h2 {{ selectedRecipe.name }}
            n-input-number.batch-count(v-model:value="quantity" :min="1" :max="100" :precision="0" :disabled="busy || loading || Boolean(pending)" aria-label="Количество партий")
          world-payment-sources(v-model:checked="useObjectBudget" :mode="state.object_budget_payment ? 'budget-choice' : 'personal'" :price="displayedTerms?.price" :disabled="busy || Boolean(pending)")
          template(v-if="displayedTerms")
            .material-tiles
              .material-tile(v-for="material in displayedTerms.materials" :key="material.item_id" :class="{ missing: !material.available }")
                font-awesome-icon(icon="cubes" aria-hidden="true")
                strong {{ material.name }}
                span {{ material.have }} / {{ material.quantity }}
                router-link(v-if="materialRecipe(material.item_id) && materialRecipe(material.item_id) !== recipe" :to="recipeLink(Number(materialRecipe(material.item_id)))") Изготовить
            p.craft-summary
              span(:class="{ missing: !displayedTerms.output.fits }" :title="displayedTerms.output.name") ×{{ displayedTerms.output.quantity }}
              span
                font-awesome-icon(icon="star" aria-hidden="true")
                |  +{{ displayedTerms.experience }} XP
              span {{ state.storages.find(s => s.id === output)?.name }}
            p.missing(v-for="reason in (calculating || waitingForPreview ? [] : displayedTerms.reasons)" :key="reason") {{ reason }}
          template(v-else)
            .material-tiles(v-if="selectedRecipe.materials?.length")
              .material-tile(v-for="material in selectedRecipe.materials" :key="material.item_id" :class="{ missing: !material.available }")
                font-awesome-icon(icon="cubes" aria-hidden="true")
                strong {{ material.name }}
                span {{ material.have }} / {{ material.quantity * (quantity ?? 1) }}
                router-link(v-if="material.recipe_id && material.recipe_id !== recipe" :to="recipeLink(material.recipe_id)") Изготовить
            p.missing(v-for="reason in Array.from(new Set([...selectedRecipe.locked_reasons, ...selectedRecipe.availability_reasons]))" :key="reason") {{ reason }}
            p(v-if="!sources.length || !output") Выберите хранилища в настройках ниже.
            p.missing(v-for="role in state.equipment.filter(e => !equipment[e.item_id])" :key="role.item_id") Недоступно: {{ role.name }}
          n-button(v-if="pending" :theme-overrides="actionTheme" type="primary" block :loading="busy" :disabled="busy || loading" @click="retryPending") Проверить предыдущее действие
          n-button(v-else :theme-overrides="actionTheme" type="primary" block :loading="busy || calculating || waitingForPreview || loading" :disabled="blocked || !calculation || Boolean(calculation.terms.reasons.length)" @click="craft")
            template(#icon)
              font-awesome-icon(icon="hammer" aria-hidden="true")
            | {{ displayedTerms ? 'Изготовить' : calculating || waitingForPreview || loading ? 'Рассчитываем…' : 'Изготовление недоступно' }}
            world-credits(v-if="displayedTerms" :value="displayedTerms.price" cost)
          n-alert.craft-result(v-if="notice" type="success" role="status")
            strong {{ notice }}
            template(v-if="lastResult")
              p Получено: {{ lastResult.output.name }} × {{ lastResult.output.quantity }}
              p Затрачено: {{ lastResult.materials.map(material => `${material.name} × ${material.quantity}`).join(', ') || 'без материалов' }}
              p(v-if="lastResult.price !== '0.0000'") Кредиты: #[world-credits(:value="lastResult.price")]
              p Опыт: +{{ lastResult.experience }} XP
          n-button(:theme-overrides="actionTheme" v-if="error && !calculation" :disabled="blocked" @click="preview") Повторить расчёт
          world-disclosure.craft-settings(label="Материалы и оборудование" icon="toolbox")
            label Источники материалов — по порядку
              n-select(v-model:value="sources" :options="storageOptions" multiple :disabled="busy || loading || Boolean(pending)" placeholder="До 20 хранилищ")
            label Куда положить результат
              n-select(v-model:value="output" :options="outputOptions" :disabled="busy || loading || Boolean(pending)")
            label(v-for="role in state.equipment" :key="role.item_id") {{ role.is_station ? 'Станция' : 'Инструмент' }}: {{ role.name }}
              n-select(v-model:value="equipment[role.item_id]" :options="role.candidates.map(c => ({ label: `Прочность ${c.durability}/${c.max_durability} · ${exposure[c.exposure_class]}`, value: c.instance_id }))" :disabled="busy || loading || Boolean(pending)" placeholder="Нет доступного экземпляра")
            p(v-for="unit in displayedTerms?.equipment ?? []" :key="unit.instance_id") Износ за работу: {{ unit.wear }} · прочность {{ unit.durability }}/{{ unit.max_durability }}
            router-link(:to="`/world/nodes/${nodeId}#workshop`") Разместить вещи и оборудование →
        p(v-else) Выберите рецепт для изготовления.
</template>
<style scoped>
 .workspace { display: grid; gap: 1rem; max-width: 1320px; padding-block: 1rem 3rem; }
.workspace-navigation { min-width: 0; padding: .25rem; border-bottom: 1px solid var(--border); }
.workspace-layout { display: grid; gap: 1rem; align-items: start; min-width: 0; }
.recipe-catalog { display: grid; gap: .75rem; }
.recipe-search { width: 100%; }
.recipe-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; padding: 3px; max-height: 24rem; max-height: min(52svh, 28rem); overflow-y: auto; scrollbar-width: thin; }
.recipe-tile-wrap { position: relative; min-width: 0; }
.recipe-tile { display: grid; gap: .4rem; justify-items: start; align-content: start; width: 100%; height: 100%; min-height: 8rem; padding: .85rem; border: 1px solid var(--border); border-radius: .7rem; background: transparent; color: var(--text); cursor: pointer; text-align: left; overflow-wrap: anywhere; font-size: .875rem; line-height: 1.4; transition: border-color 160ms ease, background-color 160ms ease; }
.recipe-tile > svg { font-size: 1.3rem; color: var(--text-muted); }
.recipe-tile span, .recipe-tile small { font-size: .8125rem; color: var(--text-muted); }
.recipe-tile.ready { background: linear-gradient(145deg, #4ebc8530, #4ebc8505); border-color: #4ebc8555; }
.recipe-tile.shortage { background: linear-gradient(145deg, #d5677130, #d5677105); border-color: #d5677155; }
.recipe-tile.locked { background: repeating-linear-gradient(135deg, #ffffff06 0 6px, transparent 6px 12px); }
.recipe-tile:hover:not(:disabled) { border-color: var(--primary); }
.recipe-ingredients { display: grid; gap: .2rem; }
.recipe-ingredients .missing { color: #e6a0a8; }
.material-tile > a { grid-column: 1 / -1; padding-block: .3rem; }
.material-tile > span { white-space: nowrap; }
.recipe-tile.selected { border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
.recipe-tile.selected > svg { color: var(--primary); }
.recipe-tile:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
.recipe-tile:disabled { cursor: default; color: var(--text-muted); }
.recipe-tile.locked > svg { margin-right: 2rem; }
.recipe-tile-wrap :deep(.recipe-lock-info) { position: absolute; top: .15rem; right: .15rem; z-index: 1; }
.craft-command { display: grid; gap: 1rem; }
.craft-command p, .selected-heading h2 { margin: 0; }
.selected-heading { display: flex; align-items: center; gap: .5rem; }
.selected-heading h2 { min-width: 0; flex: 1; font-size: 1.05rem; overflow-wrap: anywhere; }
.selected-heading > svg { color: var(--text-muted); font-size: 1.25rem; }
.selected-heading .batch-count { width: 6.5rem; flex: 0 0 6.5rem; }
.material-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; }
.material-tile { display: grid; grid-template-columns: auto 1fr; gap: .35rem .5rem; padding: .65rem; border-radius: .5rem; background: var(--bg-surface-2, #242424); font-size: .8125rem; }
.material-tile > svg { color: var(--text-muted); }.material-tile > strong { min-width: 0; overflow-wrap: anywhere; }.material-tile > span { grid-column: 2; }
.workspace label { display: grid; gap: .4rem; font-size: .875rem; }
.craft-summary { display: flex; flex-wrap: wrap; align-items: baseline; gap: .5rem .75rem; font-size: .875rem; color: var(--text-muted); }
.craft-summary > span:last-child { overflow-wrap: anywhere; }
.missing { color: var(--error, #d03050); font-weight: 600; }
.craft-result p { margin-top: .35rem; }.craft-command :deep(.world-credits) { margin-left: .5rem; }
@media(min-width: 760px) {
  .workspace-layout { grid-template-columns: minmax(0, 1fr) minmax(290px, 350px); }
  .craft-command { position: sticky; top: calc(var(--site-header-height, 0px) + 1rem); }
  .recipe-tiles { grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); max-height: none; overflow: visible; }
}
@media(min-width: 1100px) { .recipe-catalog { grid-template-columns: minmax(0, 1fr) minmax(16rem, 45%); align-items: center; }.recipe-catalog > :not(.recipe-heading):not(.recipe-search) { grid-column: 1 / -1; } }
@media(prefers-reduced-motion: reduce) { .recipe-tile { transition: none; } }
</style>

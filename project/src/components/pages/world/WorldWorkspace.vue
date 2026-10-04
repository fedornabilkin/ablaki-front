<script setup lang="ts">
import { formatCredits } from '@/entities/world/credits';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NInput, NInputNumber, NSelect, NSpin } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import { useWorldCommand } from '@/hooks/useWorldCommand';
import { worldError } from '@/services/api/world';
import { loadWorkspace, previewWorkspace, type WorkspaceInput } from '@/services/api/worldWorkspace';
const route = useRoute(), auth = useStore();
const nodeId = computed(() => Number(route.params.id ?? route.query.node));
const session = computed(() => Number(auth.state.auth.revision)), owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0));
const state = shallowRef<Awaited<ReturnType<typeof loadWorkspace>> | null>(null), loading = ref(false), calculating = ref(false), error = ref(''), notice = ref('');
const recipe = ref<number | null>(null), quantity = ref<number | null>(1), sources = ref<number[]>([]), output = ref<number | null>(null), equipment = ref<Record<number, number | null>>({});
const search = ref('');
const calculation = shallowRef<(Awaited<ReturnType<typeof previewWorkspace>> & { input: WorkspaceInput }) | null>(null);
let generation = 0, previewGeneration = 0, disposed = false;
let previewTimer: ReturnType<typeof setTimeout> | undefined;
const command = useWorldCommand(session, owner, () => { notice.value = 'Действие выполнено. Данные обновлены.'; void auth.dispatch('auth/fetchData'); void load(recipe.value ?? undefined); });
const { busy, pending, error: commandError } = command;
const blocked = computed(() => busy.value || !!pending.value || loading.value || calculating.value || !state.value?.writable);
const selectedRecipe = computed(() => state.value?.recipes.find(r => r.id === recipe.value));
const storageOptions = computed(() => state.value?.storages.map(s => ({ label: `${s.name} №${s.id}`, value: s.id })) ?? []);
const outputOptions = computed(() => state.value?.storages.filter(s => s.output_allowed).map(s => ({ label: `${s.name} №${s.id}`, value: s.id })) ?? []);
const filteredRecipes = computed(() => state.value?.recipes.filter(r => r.name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())) ?? []);
const exposure: Record<string, string> = { outdoor: 'на улице', covered: 'под навесом', indoor: 'в помещении', carried: 'в рюкзаке' };
function invalidate() { clearTimeout(previewTimer); previewGeneration++; calculation.value = null; calculating.value = false; }
function schedulePreview() { invalidate(); previewTimer = setTimeout(() => { void preview(); }, 250); }
watch([quantity, sources, output, equipment], schedulePreview, { deep: true, flush: 'sync' });
async function load(selected?: number) {
  const current = ++generation; invalidate(); error.value = ''; loading.value = true;
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
function changeRecipe(value: number) { if (busy.value || pending.value || loading.value) return; recipe.value = value; notice.value = ''; void load(value); }
async function preview() {
  if (blocked.value || !state.value || !recipe.value || !output.value || !Number.isSafeInteger(quantity.value) || !quantity.value || quantity.value < 1 || quantity.value > 100 || selectedRecipe.value?.locked_reasons.length) return;
  if (!sources.value.length || sources.value.length > 20 || state.value.equipment.some(e => !equipment.value[e.item_id])) return;
  const input: WorkspaceInput = { node_id: nodeId.value, recipe_id: recipe.value, quantity: quantity.value, source_storage_ids: [...sources.value], output_storage_id: output.value, equipment_instance_ids: state.value.equipment.map(e => equipment.value[e.item_id] as number).sort((a, b) => a - b) };
  const current = ++previewGeneration; calculating.value = true; calculation.value = null; error.value = ''; notice.value = '';
  try { const result = await previewWorkspace(input); if (!disposed && current === previewGeneration) calculation.value = { ...result, input }; }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
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
watch([nodeId, session, owner], () => { state.value = null; sources.value = []; output.value = null; equipment.value = {}; recipe.value = null; notice.value = ''; search.value = ''; void load(); }, { immediate: true, flush: 'sync' });
onScopeDispose(() => { disposed = true; generation++; invalidate(); });
</script>
<template lang="pug">
page-header(:pageTitle="state ? `Мастерская: ${state.name}` : 'Мастерская в мире'")
.container.workspace
  nav.links
    router-link(:to="`/world/nodes/${nodeId}`") Вернуться к объекту
    router-link(to="/craft") Рецепты и рюкзак
    n-button(:loading="loading" :disabled="busy" @click="load(recipe ?? undefined)") Обновить
  n-alert(v-if="commandError || error" type="error" role="alert") {{ commandError || error }}
  n-alert(v-if="notice" type="success" role="status") {{ notice }}
  n-alert(v-if="pending" type="info")
    p Ответ на действие ещё не получен. Повтор отправит тот же запрос.
    n-button(:loading="busy" @click="command.retry") Повторить запрос
  n-spin(v-if="loading && !state" aria-label="Загрузка мастерской")
  template(v-if="state")
    n-alert(v-if="!state.writable" type="info") Мастерская временно доступна только для просмотра.
    .workspace-layout
      section.recipe-catalog(aria-label="Рецепты мастерской")
        n-input(v-model:value="search" clearable placeholder="Найти рецепт" aria-label="Найти рецепт")
        p.recipe-legend Выберите плитку. Материалы и оборудование подбираются автоматически; стоимость появится в панели справа.
        .recipe-tiles
          button.recipe-tile(v-for="entry in filteredRecipes" :key="entry.id" type="button" :class="{ selected: recipe === entry.id, ready: entry.available }" :aria-pressed="recipe === entry.id" :disabled="busy || loading || Boolean(pending)" @click="changeRecipe(entry.id)")
            font-awesome-icon(:icon="entry.icon || 'cube'" aria-hidden="true")
            strong {{ entry.name }}
            small ×{{ entry.quantity }} за партию
            span {{ entry.available ? '✓ Доступно' : entry.locked_reasons.length ? 'Закрыто' : 'Не хватает ресурсов' }}
        p(v-if="!filteredRecipes.length") Рецептов по этому запросу нет.
      aside.craft-command(aria-label="Изготовление выбранного предмета" aria-live="polite")
        template(v-if="selectedRecipe")
          .selected-heading
            font-awesome-icon(:icon="selectedRecipe.icon || 'cube'" aria-hidden="true")
            h2 {{ selectedRecipe.name }}
          label Количество партий
            n-input-number(v-model:value="quantity" :min="1" :max="100" :precision="0" :disabled="busy || loading || Boolean(pending)")
          p(v-if="calculating || loading" role="status") Рассчитываем материалы и стоимость…
          template(v-else-if="calculation")
            .material-tiles
              .material-tile(v-for="material in calculation.terms.materials" :key="material.item_id" :class="{ missing: !material.available }")
                font-awesome-icon(icon="cubes" aria-hidden="true")
                strong {{ material.name }}
                span {{ material.have }} / {{ material.quantity }}
                small {{ material.available ? 'В наличии' : 'Не хватает' }}
            p(:class="{ missing: !calculation.terms.output.fits }") Результат: {{ calculation.terms.output.name }} × {{ calculation.terms.output.quantity }}
            p +{{ calculation.terms.experience }} XP · {{ state.storages.find(s => s.id === output)?.name }}
            p.missing(v-for="reason in calculation.terms.reasons" :key="reason") {{ reason }}
          template(v-else)
            p.missing(v-for="reason in Array.from(new Set([...selectedRecipe.locked_reasons, ...selectedRecipe.availability_reasons]))" :key="reason") {{ reason }}
            p(v-if="!sources.length || !output") Выберите хранилища в настройках ниже.
            p.missing(v-for="role in state.equipment.filter(e => !equipment[e.item_id])" :key="role.item_id") Недоступно: {{ role.name }}
          n-button(type="primary" block :loading="busy || calculating" :disabled="blocked || !calculation || Boolean(calculation.terms.reasons.length)" @click="craft") {{ calculation ? `Изготовить · ${formatCredits(calculation.terms.price)} Cr` : 'Изготовление недоступно' }}
          n-button(v-if="error && !calculation" :disabled="blocked" @click="preview") Повторить расчёт
          details.craft-settings
            summary Материалы, инструменты и место результата
            label Источники материалов — по порядку
              n-select(v-model:value="sources" :options="storageOptions" multiple :disabled="busy || loading || Boolean(pending)" placeholder="До 20 хранилищ")
            label Куда положить результат
              n-select(v-model:value="output" :options="outputOptions" :disabled="busy || loading || Boolean(pending)")
            label(v-for="role in state.equipment" :key="role.item_id") {{ role.is_station ? 'Станция' : 'Инструмент' }}: {{ role.name }}
              n-select(v-model:value="equipment[role.item_id]" :options="role.candidates.map(c => ({ label: `Прочность ${c.durability}/${c.max_durability} · ${exposure[c.exposure_class]}`, value: c.instance_id }))" :disabled="busy || loading || Boolean(pending)" placeholder="Нет доступного экземпляра")
            p(v-for="unit in calculation?.terms.equipment ?? []" :key="unit.instance_id") Износ за работу: {{ unit.wear }} · прочность {{ unit.durability }}/{{ unit.max_durability }}
            router-link(:to="`/world/nodes/${nodeId}#workshop`") Разместить вещи и оборудование →
        p(v-else) Выберите рецепт для изготовления.
</template>
<style scoped>
.workspace { display: grid; gap: 1rem; max-width: 1320px; padding-bottom: 2rem; }
.workspace-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 360px); gap: 1rem; align-items: start; }
.recipe-catalog { min-width: 0; }.recipe-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(125px, 1fr)); gap: .65rem; }
.recipe-tile { display: grid; gap: .4rem; justify-items: start; align-content: start; min-height: 145px; padding: .8rem; border: 1px solid var(--border); border-radius: .6rem; background: var(--bg-surface); color: var(--text); cursor: pointer; text-align: left; overflow-wrap: anywhere; }.recipe-tile > svg { font-size: 1.7rem; color: var(--primary); }.recipe-tile span, .recipe-tile small { font-size: .75rem; color: var(--text-muted); }.recipe-tile.ready span { color: var(--success, #249653); }.recipe-tile.selected { outline: 2px solid var(--primary); background: var(--primary-soft); }.recipe-tile:focus-visible { outline: 2px solid var(--primary); }.recipe-tile:disabled { cursor: default; opacity: .6; }
.craft-command { display: grid; gap: .8rem; padding: 1rem; border: 1px solid var(--border); border-radius: .7rem; background: var(--bg-surface); position: sticky; top: 1rem; }.craft-command p, .selected-heading h2 { margin: 0; }.selected-heading { display: flex; align-items: center; gap: .6rem; }.selected-heading h2 { font-size: 1.2rem; }.selected-heading > svg { color: var(--primary); font-size: 1.6rem; }
.material-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; }.material-tile { display: grid; gap: .3rem; padding: .6rem; border: 1px solid var(--border); border-radius: .4rem; font-size: .8rem; }.craft-settings summary { cursor: pointer; color: var(--text-muted); }.craft-settings label, .craft-settings p { margin-top: .7rem; }
@media(max-width: 760px) { .workspace-layout { grid-template-columns: 1fr; }.craft-command { position: static; }.recipe-tiles { max-height: 45vh; overflow: auto; padding: 3px; } }
.workspace label { display: grid; gap: .4rem; }
.links { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
.ready { color: var(--success, #249653); font-weight: 700; }
.recipe-legend { color: var(--text-muted); }
.missing { color: var(--error, #d03050); font-weight: 600; }
</style>

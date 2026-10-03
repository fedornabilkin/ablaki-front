<script setup lang="ts">
import { formatCredits } from '@/entities/world/credits';
import { h, computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NInputNumber, NSelect, NSpin } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import { useWorldCommand } from '@/hooks/useWorldCommand';
import { worldError } from '@/services/api/world';
import { loadWorkspace, previewWorkspace, type WorkspaceInput } from '@/services/api/worldWorkspace';
const route = useRoute(), auth = useStore();
const nodeId = computed(() => Number(route.params.id ?? route.query.node));
const session = computed(() => Number(auth.state.auth.revision)), owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0));
const state = shallowRef<Awaited<ReturnType<typeof loadWorkspace>> | null>(null), loading = ref(false), calculating = ref(false), error = ref(''), notice = ref('');
const recipe = ref<number | null>(null), quantity = ref<number | null>(1), sources = ref<number[]>([]), output = ref<number | null>(null), equipment = ref<Record<number, number | null>>({});
const calculation = shallowRef<(Awaited<ReturnType<typeof previewWorkspace>> & { input: WorkspaceInput }) | null>(null);
let generation = 0, previewGeneration = 0, disposed = false;
const command = useWorldCommand(session, owner, () => { notice.value = 'Действие выполнено. Данные обновлены.'; void auth.dispatch('auth/fetchData'); void load(recipe.value ?? undefined); });
const { busy, pending, error: commandError } = command;
const blocked = computed(() => busy.value || !!pending.value || loading.value || calculating.value || !state.value?.writable);
const selectedRecipe = computed(() => state.value?.recipes.find(r => r.id === recipe.value));
const storageOptions = computed(() => state.value?.storages.map(s => ({ label: `${s.name} №${s.id}`, value: s.id })) ?? []);
const outputOptions = computed(() => state.value?.storages.filter(s => s.output_allowed).map(s => ({ label: `${s.name} №${s.id}`, value: s.id })) ?? []);
const recipeLabel = (option: { label: string; available?: boolean }) => h('span', { style: option.available ? { color: 'var(--success, #249653)', fontWeight: '700' } : {} }, `${option.available ? '✓ ' : ''}${option.label}`);
const exposure: Record<string, string> = { outdoor: 'на улице', covered: 'под навесом', indoor: 'в помещении', carried: 'в рюкзаке' };
function invalidate() { previewGeneration++; calculation.value = null; calculating.value = false; }
watch([quantity, sources, output, equipment], invalidate, { deep: true, flush: 'sync' });
async function load(selected?: number) {
  const current = ++generation; invalidate(); error.value = ''; loading.value = true; state.value = null;
  if (!Number.isSafeInteger(nodeId.value) || nodeId.value < 1 || nodeId.value > 2147483647) { error.value = 'Некорректный адрес мастерской.'; loading.value = false; return; }
  try {
    const value = await loadWorkspace(nodeId.value, selected); if (disposed || generation !== current) return;
    state.value = value; recipe.value = value.recipe_id;
    sources.value = sources.value.filter(id => value.storages.some(s => s.id === id));
    if (!sources.value.length) sources.value = value.storages.slice(0, 20).map(s => s.id);
    if (!value.storages.some(s => s.id === output.value && s.output_allowed)) output.value = value.storages.find(s => s.kind === 'backpack' && s.output_allowed)?.id ?? value.storages.find(s => s.output_allowed)?.id ?? null;
    equipment.value = Object.fromEntries(value.equipment.map(e => [e.item_id, e.candidates.some(c => c.instance_id === equipment.value[e.item_id]) ? equipment.value[e.item_id] : e.candidates[0]?.instance_id ?? null]));
  } catch (cause) { if (generation === current && !disposed) error.value = worldError(cause); }
  finally { if (generation === current && !disposed) loading.value = false; }
}
function changeRecipe(value: number) { recipe.value = value; notice.value = ''; void load(value); }
async function preview() {
  if (blocked.value || !state.value || !recipe.value || !output.value || !quantity.value) return;
  if (!sources.value.length || sources.value.length > 20 || state.value.equipment.some(e => !equipment.value[e.item_id])) { error.value = 'Выберите источники материалов и каждый инструмент или станцию.'; return; }
  const input: WorkspaceInput = { node_id: nodeId.value, recipe_id: recipe.value, quantity: quantity.value, source_storage_ids: [...sources.value], output_storage_id: output.value, equipment_instance_ids: state.value.equipment.map(e => equipment.value[e.item_id] as number).sort((a, b) => a - b) };
  const current = ++previewGeneration; calculating.value = true; calculation.value = null; error.value = ''; notice.value = '';
  try { const result = await previewWorkspace(input); if (!disposed && current === previewGeneration) calculation.value = { ...result, input }; }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
function craft() { if (calculation.value && !blocked.value && !calculation.value.terms.reasons.length) void command.submit('/workspace/craft', { ...calculation.value.input }, calculation.value.quote); }
watch([nodeId, session, owner], () => { sources.value = []; output.value = null; equipment.value = {}; recipe.value = null; notice.value = ''; void load(); }, { immediate: true, flush: 'sync' });
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
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
  n-spin(v-if="loading" aria-label="Загрузка мастерской")
  template(v-else-if="state")
    n-alert(v-if="!state.writable" type="info") Мастерская временно доступна только для просмотра.
    label Рецепт
      n-select(:value="recipe" :options="state.recipes.map(r => ({ label: `${r.name} × ${r.quantity}`, value: r.id, available: r.available }))" :render-label="recipeLabel" filterable :disabled="blocked" @update:value="changeRecipe")
    p.recipe-legend Зелёным отмечены рецепты на одну партию, для которых есть ресурсы и оборудование в доступных хранилищах стоянки.
    p.ready(v-if="selectedRecipe?.available") ✓ Ресурсы, инструменты и станции доступны
    p.missing(v-for="reason in selectedRecipe?.availability_reasons" :key="reason") {{ reason }}
    label Количество изготовлений
      n-input-number(v-model:value="quantity" :min="1" :max="100" :precision="0" :disabled="blocked")
    label Источники материалов — расходуются в порядке выбора
      n-select(v-model:value="sources" :options="storageOptions" multiple :disabled="blocked" placeholder="Выберите до 20 хранилищ")
    label Куда положить результат
      n-select(v-model:value="output" :options="outputOptions" :disabled="blocked")
    label(v-for="role in state.equipment" :key="role.item_id") {{ role.is_station ? 'Станция' : 'Инструмент' }}: {{ role.name }}
      n-select(v-model:value="equipment[role.item_id]" :options="role.candidates.map(c => ({ label: `Экземпляр №${c.instance_id} · ${c.durability}/${c.max_durability} · ${exposure[c.exposure_class]}`, value: c.instance_id }))" :disabled="blocked" placeholder="Нет доступного экземпляра")
    n-button(:loading="calculating" :disabled="blocked || !recipe || Boolean(selectedRecipe?.locked_reasons.length)" @click="preview") Рассчитать изготовление
    section(v-if="calculation" aria-live="polite")
      h2 Подтверждение
      ul
        li(v-for="material in calculation.terms.materials" :key="material.item_id" :class="{ missing: !material.available }") {{ material.name }}: {{ material.have }} / {{ material.quantity }}
        li(v-for="unit in calculation.terms.equipment" :key="`unit-${unit.instance_id}`") Экземпляр №{{ unit.instance_id }}: прочность {{ unit.durability }}/{{ unit.max_durability }}, износ за работу {{ unit.wear }}
      p(:class="{ missing: !calculation.terms.output.fits }") Результат: {{ calculation.terms.output.name }} × {{ calculation.terms.output.quantity }} → хранилище №{{ calculation.terms.output.storage_id }}
      p Стоимость: {{ formatCredits(calculation.terms.price) }} Cr · Опыт рецепта: {{ calculation.terms.experience }} (с учётом действующего предела навыка)
      p.missing(v-for="reason in calculation.terms.reasons" :key="reason") {{ reason }}
      n-button(type="primary" :loading="busy" :disabled="blocked || Boolean(calculation.terms.reasons.length)" @click="craft") Изготовить
</template>
<style scoped>
.workspace { display: grid; gap: 1rem; max-width: 960px; padding-bottom: 2rem; }
.workspace label { display: grid; gap: .4rem; }
.links { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
.ready { color: var(--success, #249653); font-weight: 700; }
.recipe-legend { color: var(--text-muted); }
.missing { color: var(--error, #d03050); font-weight: 600; }
</style>

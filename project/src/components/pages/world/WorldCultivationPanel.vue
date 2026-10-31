<script setup lang="ts">
import WorldCredits from '@/components/pages/world/WorldCredits.vue';
import WorldPaymentSources from './WorldPaymentSources.vue';
import { worldActionButtonTheme, worldDangerButtonTheme } from '@/entities/world/theme';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton } from 'naive-ui';
import { needsPersonalTopUp } from '@/entities/world/credits';
import { useWorldBudget } from '@/hooks/useWorldBudget';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { loadCultivation, loadCrops, previewCultivation, type CultivationAction } from '@/services/api/worldCultivation';
import { worldError } from '@/services/api/world';
import type { WorldQuote } from '@/entities/world/types';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import WorldHelpHint from './WorldHelpHint.vue';
const props = withDefaults(defineProps<{ bedId: number; session: number; command: WorldCommandRunner; droppedCrop?: { id: number; sequence: number } | null; active?: boolean }>(), { active: true });
const personalContribution = ref(false);
const digReceipt = ref<string | null>(null);
const payerNode = ref<number | null>(null);
const { available: availableBudget, refresh: refreshBudget } = useWorldBudget(payerNode, computed(() => props.session));
const state = shallowRef<Awaited<ReturnType<typeof loadCultivation>> | null>(null), crops = shallowRef<Awaited<ReturnType<typeof loadCrops>>['items']>([]);
const error = ref(''), loading = ref(false), calculating = ref(false), selected = ref<number | null>(null), page = ref(1), pages = ref(1);
const quote = shallowRef<{ action: CultivationAction; input: Record<string, unknown>; value: WorldQuote } | null>(null);
const now = ref(Math.floor(Date.now() / 1000)); let offset = 0, generation = 0, previewGeneration = 0, disposed = false;
const visible = usePageVisibility();
const checkedDeadlines = new Set<string>();
let cataloguePage: number | null = null;
const labels: Record<CultivationAction, string> = { dig: 'Вскопать грядку', sow: 'Посадить семена', water: 'Полить', harvest: 'Собрать урожай', cancel: 'Очистить грядку' };
const cycle = computed(() => state.value?.cycle), crop = computed(() => crops.value.find(c => c.id === selected.value));
const canWaterNow = computed(() => Boolean(cycle.value?.can_water && cycle.value.water_deadline_at !== null && now.value < cycle.value.water_deadline_at && now.value < cycle.value.ready_at));
const waterTimer = computed(() => {
  const c = cycle.value;
  if (!c || c.water_due_at === null) return '00:00:00';
  return countdown((now.value < c.water_due_at ? c.water_due_at : c.water_deadline_at ?? c.ready_at) - now.value);
});
const locked = computed(() => !visible.value || props.active === false || loading.value || calculating.value || props.command.busy.value || Boolean(props.command.pending.value) || !state.value?.writable);
const materials = computed(() => (quote.value?.value.terms.materials ?? []) as { name: string; quantity: number; have: number; available: boolean }[]);
const tool = computed(() => quote.value?.value.terms.tool as { name: string; durability: number; wear: number; available: boolean } | undefined);
const canConfirm = computed(() => materials.value.every(m => m.available) && tool.value?.available !== false && (quote.value?.value.terms.output as { fits?: boolean } | undefined)?.fits !== false);
const primaryAction = computed<CultivationAction | null>(() => !state.value ? null : !cycle.value ? (state.value.dug ? 'sow' : 'dig') : now.value >= cycle.value.expires_at ? null : now.value >= cycle.value.ready_at ? 'harvest' : canWaterNow.value ? 'water' : null);
const ready = computed(() => quote.value?.action === primaryAction.value && canConfirm.value && !paymentRequired.value);
const cost = computed(() => [...materials.value.map(m => `${m.quantity} ${m.name}`), ...(tool.value ? [`${tool.value.name}: ${tool.value.wear} прочности`] : [])].join(', ') || 'бесплатно');
const price = computed(() => typeof quote.value?.value.terms.price_cr === 'string' ? quote.value.value.terms.price_cr : '0');
const paymentRequired = computed(() => !personalContribution.value && needsPersonalTopUp(price.value, availableBudget.value));
const duration = (seconds: number) => { const s = Math.max(0, Math.ceil(seconds)); return s >= 3600 ? `${Math.floor(s / 3600)} ч ${Math.floor(s % 3600 / 60)} мин` : `${Math.floor(s / 60)} мин ${s % 60} с`; };
const countdown = (seconds: number) => { const s = Math.max(0, Math.ceil(seconds)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':'); };
async function load(refreshFunds = true) {
  const current = ++generation; previewGeneration++; loading.value = true; calculating.value = false; error.value = ''; quote.value = null;
  try {
    const requestedPage = page.value;
    const [bed, catalogue] = await Promise.all([loadCultivation(props.bedId), cataloguePage === requestedPage ? Promise.resolve(null) : loadCrops(requestedPage)]);
    if (disposed || current !== generation) return;
    state.value = bed; offset = bed.server_time - Math.floor(Date.now() / 1000); now.value = bed.server_time;
    if (catalogue) { crops.value = catalogue.items; pages.value = catalogue.pageCount; cataloguePage = requestedPage; }
    if (refreshFunds) void refreshBudget();
    if (!crops.value.some(c => c.id === selected.value)) selected.value = crops.value[0]?.id ?? null;
  } catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
async function preview(action: CultivationAction) {
  if (locked.value || (action === 'sow' && !selected.value)) return;
  const current = ++previewGeneration; calculating.value = true; error.value = ''; quote.value = null;
  const input = { ...(action === 'sow' ? { crop_revision_id: selected.value } : {}), ...(personalContribution.value ? { top_up: true } : {}) };
  try { const value = await previewCultivation(props.bedId, action, input); if (!disposed && current === previewGeneration) { quote.value = { action, input, value }; if (typeof value.terms.payer_node_id === 'number') payerNode.value = value.terms.payer_node_id; } }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
async function confirm() {
  if (!quote.value || locked.value || !canConfirm.value) return;
  const q = quote.value; quote.value = null;
  await props.command.submit(`/beds/${props.bedId}/${q.action}`, q.input, q.value);
  if (props.command.error.value) error.value = props.command.error.value;
  if (!disposed && !props.command.pending.value && !props.command.error.value) await load();
}
async function execute() {
  if (!ready.value || locked.value || !quote.value) return;
  const shown = quote.value, current = ++previewGeneration; calculating.value = true; error.value = '';
  try {
    const fresh = await previewCultivation(props.bedId, shown.action, shown.input);
    if (disposed || current !== previewGeneration) return;
    quote.value = { ...shown, value: fresh };
    if (JSON.stringify(fresh.terms) !== JSON.stringify(shown.value.terms)) { error.value = 'Условия изменились. Проверьте обновлённый расход ресурсов.'; return; }
    const result = await props.command.submit(`/beds/${props.bedId}/${shown.action}`, shown.input, fresh);
    if (props.command.error.value) error.value = props.command.error.value;
    if (result && shown.action === 'dig' && typeof fresh.terms.worker_reward_cr === 'string') digReceipt.value = fresh.terms.worker_reward_cr;
    if (!disposed && !props.command.pending.value && !props.command.error.value) await load();
  } catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
watch([() => props.bedId, () => props.session], () => { checkedDeadlines.clear(); cataloguePage = null; state.value = null; crops.value = []; digReceipt.value = null; payerNode.value = null; personalContribution.value = false; if (props.active !== false) void load(); }, { immediate: true });
watch(page, () => { if (props.active !== false) void load(); });
watch(selected, () => { quote.value = null; previewGeneration++; calculating.value = false; }, { flush: 'sync' });
watch(personalContribution, () => { quote.value = null; previewGeneration++; calculating.value = false; }, { flush: 'sync' });
watch([primaryAction, selected, personalContribution, loading, props.command.busy, props.command.pending], () => { if (primaryAction.value && !locked.value && !quote.value) void preview(primaryAction.value); }, { flush: 'post' });
const pendingSeed = ref<number | null>(null);
function dragSeed(event: DragEvent, id: number) { if (event.dataTransfer) { event.dataTransfer.setData('application/x-ablaki-crop', String(id)); event.dataTransfer.effectAllowed = 'copy'; } }
function plantDropped(id: number) {
  if (!Number.isSafeInteger(id) || !crops.value.some(c => c.id === id) || !state.value?.dug || cycle.value) return;
  pendingSeed.value = id; selected.value = id;
  if (ready.value && !locked.value) { pendingSeed.value = null; void execute(); }
}
function dropSeed(event: DragEvent) { plantDropped(Number(event.dataTransfer?.getData('application/x-ablaki-crop'))); }
let handledDrop = -1;
watch([() => props.droppedCrop, loading], () => {
  const drop = props.droppedCrop;
  if (!drop || loading.value || !state.value || drop.sequence === handledDrop) return;
  handledDrop = drop.sequence; plantDropped(drop.id);
}, { immediate: true, flush: 'post' });
watch([ready, locked, state], () => {
  if (pendingSeed.value !== null && pendingSeed.value === selected.value && ready.value && !locked.value) { pendingSeed.value = null; void execute(); }
});
watch(() => props.bedId, () => { pendingSeed.value = null; });
const timer = setInterval(() => {
  now.value = Math.floor(Date.now() / 1000) + offset;
  checkDeadlines();
}, 1000);
function checkDeadlines() {
  if (!visible.value || props.active === false || !cycle.value || !state.value || locked.value) return;
  const due = [cycle.value.ready_at, cycle.value.expires_at, cycle.value.water_due_at, cycle.value.water_deadline_at]
    .filter((t): t is number => t !== null && state.value!.server_time < t && now.value >= t && !checkedDeadlines.has(`${cycle.value!.id}:${t}`));
  if (!due.length) return;
  due.forEach(t => checkedDeadlines.add(`${cycle.value!.id}:${t}`));
  void load(false);
}
watch([visible, () => props.active], () => { if (!visible.value || props.active === false) return; if (!state.value && !loading.value) void load(); else checkDeadlines(); });
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; clearInterval(timer); });
</script>
<template lang="pug">
section.cultivation-panel(aria-label="Грядка" @dragover.prevent @drop.prevent.stop="dropSeed")
  .cultivation-heading
    h2 {{ !state || cycle ? 'Выращивание' : state.dug ? 'Грядка готова к посадке' : 'Подготовка земли' }}
    world-help-hint(label="Как выращивать урожай")
      p Вскопайте землю, посадите семена и следите за сроками полива и сбора.
      p Семена, вода и лопата — из рюкзака. Урожай попадёт в мини-склад, а при его отсутствии — в рюкзак.
      p(v-if="state && !state.owner") Помогите владельцу вскопать грядку: оплата поступит из бюджета огорода на ваш баланс. Лопата нужна своя.
  n-alert(closable v-if="error" type="error") {{ error }}
  n-alert(closable v-if="digReceipt !== null" type="success" @close="digReceipt = null")
    | Грядка вскопана.
    template(v-if="Number(digReceipt) > 0")  Зачислено: #[world-credits(:value="digReceipt")].
  template(v-if="state")
    p(v-if="typeof quote?.value.terms.worker_reward_cr === 'string' && Number(quote.value.terms.worker_reward_cr) > 0") Оплата: #[world-credits(:value="quote.value.terms.worker_reward_cr")].
    template(v-if="!cycle")
      .cultivation-dig(v-if="!state.dug")
        n-button(:theme-overrides="worldActionButtonTheme" type="primary" :disabled="locked || !ready" @click="execute") Вскопать
        world-help-hint(label="Расход прочности лопаты" symbol="!")
          p {{ tool ? `Расходуется ${tool.wear} ед. прочности лопаты. ${tool.available ? 'Лопата доступна.' : 'Нужна исправная лопата в рюкзаке.'}` : 'Для перекопки нужна исправная лопата в рюкзаке.' }}
      template(v-else-if="state.owner")
        .crop-tiles(aria-label="Культуры для посадки")
          button.crop-tile(v-for="entry in crops" :key="entry.id" type="button" :class="{ selected: selected === entry.id }" :aria-pressed="selected === entry.id" :disabled="locked" :draggable="!locked" @dragstart="dragSeed($event, entry.id)" @click="selected = entry.id")
            font-awesome-icon(icon="seedling" aria-hidden="true")
            strong(:title="entry.name") {{ entry.name }}
            small(:aria-label="`Семян: ${entry.seed_quantity}, урожай: ${entry.yield_quantity}`") {{ entry.seed_quantity }} → {{ entry.yield_quantity }}
        .cultivation-actions(v-if="pages > 1")
          n-button(:theme-overrides="worldActionButtonTheme" :disabled="page <= 1 || locked" @click="page--") Назад
          span {{ page }} / {{ pages }}
          n-button(:theme-overrides="worldActionButtonTheme" :disabled="page >= pages || locked" @click="page++") Далее
        template(v-if="crop")
          .crop-summary
            span(:title="`Время роста: ${duration(typeof quote?.value.terms.grow_seconds === 'number' ? quote.value.terms.grow_seconds : crop.grow_seconds)}`")
              font-awesome-icon(icon="clock" aria-hidden="true")
              |  {{ duration(typeof quote?.value.terms.grow_seconds === 'number' ? quote.value.terms.grow_seconds : crop.grow_seconds) }}
            world-help-hint(label="Полив и сбор урожая")
              p Семян: {{ crop.seed_quantity }} · Урожай: {{ crop.yield_quantity }}.
              p(v-if="crop.water_quantity") Полив каждые {{ duration(crop.water_interval_seconds) }}, окно полива — {{ duration(crop.water_window_seconds) }}.
              p Соберите урожай в течение {{ duration(crop.harvest_window_seconds) }} после созревания.
        n-button(:theme-overrides="worldActionButtonTheme" type="primary" :disabled="locked || !ready" @click="execute")
          template(#icon)
            font-awesome-icon(icon="seedling" aria-hidden="true")
          | Посадить семена
    template(v-else)
      h3 {{ cycle.name }}
      n-alert(closable v-if="cycle.state === 'expired'" type="error") Урожай погиб: срок сбора истёк. Уберите остатки, чтобы подготовить новый посев.
      n-alert(closable v-else-if="cycle.water_missed" type="warning") Полив пропущен. Урожай уменьшен вдвое; рост продолжается.
      n-alert(closable v-if="cycle.event_loss_bps" type="warning") Погодные события уменьшили урожай на {{ cycle.event_loss_bps / 100 }}%. Защита теплицы уже учтена.
      .cultivation-metrics
        n-button.cultivation-timer.harvest-timer(:theme-overrides="worldActionButtonTheme" :type="primaryAction === 'harvest' ? 'primary' : 'default'" :disabled="locked || primaryAction !== 'harvest' || !ready" @click="execute")
          .timer-label
            span Собрать
            strong {{ now < cycle.ready_at ? countdown(cycle.ready_at - now) : cycle.state === 'expired' ? 'Урожай погиб' : 'Урожай созрел' }}
        n-button.cultivation-timer.water-timer(v-if="cycle.water_due_at && cycle.water_due_at < cycle.ready_at" :theme-overrides="worldActionButtonTheme" :type="primaryAction === 'water' ? 'primary' : 'default'" :disabled="locked || primaryAction !== 'water' || !ready" @click="execute")
          .timer-label
            span Полить
            strong {{ waterTimer }}
        .cultivation-death-timer
          span До гибели урожая
          strong {{ countdown(cycle.expires_at - now) }}
      .cultivation-actions
        n-button(:theme-overrides="worldDangerButtonTheme" type="error" :disabled="locked" @click="preview('cancel')")
          template(#icon)
            font-awesome-icon(icon="times" aria-hidden="true")
          | Очистить грядку
    .cultivation-cost(v-if="quote" aria-live="polite")
      .cultivation-heading
        span Расход ресурсов
        world-help-hint(label="Ресурсы для действия")
          p {{ labels[quote.action] }}: {{ cost }}.
          p(v-if="tool") {{ tool.name }}: {{ tool.durability }} прочности. Расход: {{ tool.wear }}.
      .cultivation-resources(v-if="quote.action !== 'cancel'")
        span(v-for="(material, i) in materials" :key="i" :class="{ missing: !material.available }" :title="material.available ? 'Хватает' : 'Недостаточно'")
          font-awesome-icon(:icon="material.available ? 'check' : 'times'" aria-hidden="true")
          |  {{ material.name }} {{ material.have }}/{{ material.quantity }}
        world-credits(:value="price ?? '0'" cost)
      world-payment-sources(v-if="quote.action !== 'cancel'" v-model:checked="personalContribution" :price="price" :available="availableBudget" :disabled="locked")
      p.missing(v-if="quote.action !== 'cancel' && paymentRequired") В бюджете не хватает кредитов. Выберите «Баланс аккаунта» или пополните бюджет огорода.
      p(v-if="quote.action === 'cancel'") Посев будет убран без возврата семян и воды.
      p.missing(v-if="tool && !tool.available") Нужна исправная лопата в рюкзаке.
      p(v-if="quote.action === 'harvest'") Будет собрано: {{ quote.value.terms.output?.quantity }} шт.
      p.missing(v-if="!canConfirm") Проверьте ресурсы, лопату и свободные ячейки склада огорода.
      n-button(:theme-overrides="worldDangerButtonTheme" v-if="quote.action === 'cancel'" type="error" :disabled="locked || !canConfirm" @click="confirm")
        template(#icon)
          font-awesome-icon(icon="times" aria-hidden="true")
        | Очистить грядку
    p(v-if="calculating" role="status") Проверяем расход ресурсов…
    n-button(:theme-overrides="worldActionButtonTheme" v-if="error && primaryAction" :disabled="locked" @click="preview(primaryAction)") Повторить расчёт
</template>
<style scoped>
.cultivation-panel { display: grid; gap: .75rem; min-width: 0; }
.cultivation-panel h2 { margin: 0; font-size: 1rem; }.cultivation-panel h3 { margin: 0; font-size: .9rem; }
.cultivation-panel p { margin: 0; font-size: .8rem; }
.cultivation-dig { display: flex; align-items: center; gap: .5rem; }
.crop-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; }
.crop-tile { display: grid; align-content: start; gap: .35rem; min-width: 0; padding: .5rem; border: 1px solid var(--border); border-radius: .5rem; color: var(--text); background: var(--bg-surface); text-align: left; cursor: pointer; }
.crop-tile.selected { border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); background: var(--bg-accent); }
.crop-tile > svg { font-size: 1.1rem; color: var(--primary); }.crop-tile strong { font-size: .8rem; line-height: 1.35; overflow-wrap: anywhere; }.crop-tile small { font-size: .75rem; color: var(--text-muted); }
.crop-summary, .cultivation-resources { display: flex; align-items: center; flex-wrap: wrap; gap: .4rem .65rem; font-size: .75rem; color: var(--text-muted); }.crop-summary { justify-content: space-between; }
.cultivation-cost { display: grid; gap: .5rem; padding-top: .6rem; border-top: 1px solid var(--border); font-size: .8rem; }
.cultivation-heading, .cultivation-actions { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; justify-content: space-between; }
.cultivation-metrics { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: .5rem; align-items: stretch; }.cultivation-timer { height: auto; min-height: 3.5rem; padding: .5rem; }.timer-label { display: grid; gap: .2rem; text-align: center; white-space: normal; }.timer-label strong { font-size: .9rem; font-variant-numeric: tabular-nums; }.timer-label small { font-size: .7rem; }.harvest-timer { grid-column: 1; grid-row: 1; }.water-timer { grid-column: 1; grid-row: 2; }.cultivation-death-timer { grid-column: 2; grid-row: 1 / 3; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: .3rem; padding: .5rem; border: 1px solid var(--border); border-radius: .5rem; background: #e66a6808; }.cultivation-death-timer span { font-size: .75rem; color: var(--text-muted); }.cultivation-death-timer strong { font-size: 1rem; font-variant-numeric: tabular-nums; }
p { color: var(--text-muted); }
.missing { color: #e66a68; }
</style>

<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton } from 'naive-ui';
import { loadCultivation, loadCrops, previewCultivation, type CultivationAction } from '@/services/api/worldCultivation';
import { worldError } from '@/services/api/world';
import type { WorldQuote } from '@/entities/world/types';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
const props = defineProps<{ bedId: number; session: number; command: WorldCommandRunner; droppedCrop?: { id: number; sequence: number } | null }>();
const state = shallowRef<Awaited<ReturnType<typeof loadCultivation>> | null>(null), crops = shallowRef<Awaited<ReturnType<typeof loadCrops>>['items']>([]);
const error = ref(''), loading = ref(false), calculating = ref(false), selected = ref<number | null>(null), page = ref(1), pages = ref(1);
const quote = shallowRef<{ action: CultivationAction; input: Record<string, unknown>; value: WorldQuote } | null>(null);
const now = ref(Math.floor(Date.now() / 1000)); let offset = 0, generation = 0, previewGeneration = 0, disposed = false;
const labels: Record<CultivationAction, string> = { dig: 'Вскопать грядку', sow: 'Посадить семена', water: 'Полить', harvest: 'Собрать урожай', cancel: 'Убрать посев' };
const cycle = computed(() => state.value?.cycle), crop = computed(() => crops.value.find(c => c.id === selected.value));
const locked = computed(() => loading.value || calculating.value || props.command.busy.value || Boolean(props.command.pending.value) || !state.value?.writable);
const materials = computed(() => (quote.value?.value.terms.materials ?? []) as { name: string; quantity: number; have: number; available: boolean }[]);
const tool = computed(() => quote.value?.value.terms.tool as { name: string; durability: number; wear: number; available: boolean } | undefined);
const canConfirm = computed(() => materials.value.every(m => m.available) && tool.value?.available !== false && (quote.value?.value.terms.output as { fits?: boolean } | undefined)?.fits !== false);
const primaryAction = computed<CultivationAction | null>(() => !state.value ? null : !cycle.value ? (state.value.dug ? 'sow' : 'dig') : cycle.value.state === 'ripe' ? 'harvest' : cycle.value.can_water ? 'water' : null);
const ready = computed(() => quote.value?.action === primaryAction.value && canConfirm.value);
const cost = computed(() => [...materials.value.map(m => `${m.quantity} ${m.name}`), ...(tool.value ? [`${tool.value.name}: ${tool.value.wear} прочности`] : [])].join(', ') || 'бесплатно');
const duration = (seconds: number) => { const s = Math.max(0, Math.ceil(seconds)); return s >= 3600 ? `${Math.floor(s / 3600)} ч ${Math.floor(s % 3600 / 60)} мин` : `${Math.floor(s / 60)} мин ${s % 60} с`; };
const date = (seconds: number) => new Date(seconds * 1000).toLocaleString('ru-RU');
async function load() {
  const current = ++generation; previewGeneration++; loading.value = true; calculating.value = false; error.value = ''; quote.value = null;
  try {
    const [bed, catalogue] = await Promise.all([loadCultivation(props.bedId), loadCrops(page.value)]);
    if (disposed || current !== generation) return;
    state.value = bed; crops.value = catalogue.items; pages.value = catalogue.pageCount; offset = bed.server_time - Math.floor(Date.now() / 1000); now.value = bed.server_time;
    if (!catalogue.items.some(c => c.id === selected.value)) selected.value = catalogue.items[0]?.id ?? null;
  } catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
async function preview(action: CultivationAction) {
  if (locked.value || (action === 'sow' && !selected.value)) return;
  const current = ++previewGeneration; calculating.value = true; error.value = ''; quote.value = null;
  const input = action === 'sow' ? { crop_revision_id: selected.value } : {};
  try { const value = await previewCultivation(props.bedId, action, input); if (!disposed && current === previewGeneration) quote.value = { action, input, value }; }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
async function confirm() {
  if (!quote.value || locked.value || !canConfirm.value) return;
  const q = quote.value; quote.value = null;
  await props.command.submit(`/beds/${props.bedId}/${q.action}`, q.input, q.value);
  if (!disposed && !props.command.pending.value) await load();
}
async function execute() {
  if (!ready.value || locked.value || !quote.value) return;
  const shown = quote.value, current = ++previewGeneration; calculating.value = true; error.value = '';
  try {
    const fresh = await previewCultivation(props.bedId, shown.action, shown.input);
    if (disposed || current !== previewGeneration) return;
    quote.value = { ...shown, value: fresh };
    if (JSON.stringify(fresh.terms) !== JSON.stringify(shown.value.terms)) { error.value = 'Условия изменились. Проверьте обновлённый расход ресурсов.'; return; }
    await props.command.submit(`/beds/${props.bedId}/${shown.action}`, shown.input, fresh);
    if (!disposed && !props.command.pending.value && !props.command.error.value) await load();
  } catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
watch([() => props.bedId, () => props.session, page], () => { state.value = null; void load(); }, { immediate: true });
watch(selected, () => { quote.value = null; previewGeneration++; calculating.value = false; }, { flush: 'sync' });
watch([primaryAction, selected, loading, props.command.busy, props.command.pending], () => { if (primaryAction.value && !locked.value && !quote.value) void preview(primaryAction.value); }, { flush: 'post' });
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
  if (cycle.value && state.value && !locked.value && [cycle.value.ready_at, cycle.value.expires_at, cycle.value.water_due_at, cycle.value.water_deadline_at].some(t => t !== null && state.value!.server_time < t && now.value >= t)) void load();
}, 1000);
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; clearInterval(timer); });
</script>
<template lang="pug">
section.cultivation-panel(aria-label="Грядка" @dragover.prevent @drop.prevent.stop="dropSeed")
  .cultivation-heading
    div
      h2 Выращивание
      p Вскопайте землю, посадите семена и следите за сроками полива и сбора.
  n-alert(v-if="error" type="error") {{ error }}
  template(v-if="state")
    template(v-if="!cycle")
      .cultivation-card
        h3 {{ state.dug ? 'Грядка готова к посадке' : 'Подготовка земли' }}
        n-button(v-if="!state.dug" type="primary" :disabled="locked || !ready" @click="execute") Вскопать · {{ tool ? `${tool.wear} прочности лопаты` : 'нужна лопата' }}
        template(v-else)
          .crop-tiles(aria-label="Культуры для посадки")
            button.crop-tile(v-for="entry in crops" :key="entry.id" type="button" :class="{ selected: selected === entry.id }" :aria-pressed="selected === entry.id" :disabled="locked" :draggable="!locked" @dragstart="dragSeed($event, entry.id)" @click="selected = entry.id")
              font-awesome-icon(icon="seedling" aria-hidden="true")
              strong {{ entry.name }}
              small Семян: {{ entry.seed_quantity }} · Урожай: {{ entry.yield_quantity }}
              span {{ selected === entry.id ? (quote?.action === 'sow' ? (canConfirm ? 'Можно посадить' : 'Не хватает ресурсов') : 'Проверяем ресурсы…') : 'Выбрать культуру' }}
          .cultivation-actions(v-if="pages > 1")
            n-button(:disabled="page <= 1 || locked" @click="page--") Назад
            span {{ page }} / {{ pages }}
            n-button(:disabled="page >= pages || locked" @click="page++") Далее
          template(v-if="crop")
            p Семян: {{ crop.seed_quantity }} · Урожай: {{ crop.yield_quantity }} · Рост: {{ duration(crop.grow_seconds) }}
            p(v-if="crop.water_quantity") Полив каждые {{ duration(crop.water_interval_seconds) }}, окно полива — {{ duration(crop.water_window_seconds) }}.
            p Соберите урожай в течение {{ duration(crop.harvest_window_seconds) }} после созревания.
          n-button(type="primary" :disabled="locked || !ready" @click="execute") Посадить семена
      p Семена, вода и лопата — из рюкзака. Урожай попадёт на склад огорода.
    template(v-else)
      h3 {{ cycle.name }}
      n-alert(v-if="cycle.state === 'expired'" type="error") Урожай погиб: срок сбора истёк. Уберите остатки, чтобы подготовить новый посев.
      n-alert(v-else-if="cycle.water_missed" type="warning") Полив пропущен. Урожай уменьшен вдвое; рост продолжается.
      .cultivation-metrics
        .cultivation-card
          span {{ now < cycle.ready_at ? 'До созревания' : 'До гибели урожая' }}
          strong {{ duration((now < cycle.ready_at ? cycle.ready_at : cycle.expires_at) - now) }}
          small {{ date(now < cycle.ready_at ? cycle.ready_at : cycle.expires_at) }}
        .cultivation-card(v-if="cycle.water_due_at && now < cycle.ready_at")
          span {{ cycle.can_water ? 'Полив доступен' : 'Следующий полив' }}
          strong {{ cycle.can_water ? 'Пора полить' : duration(cycle.water_due_at - now) }}
          small(v-if="cycle.water_deadline_at") Успейте до {{ date(cycle.water_deadline_at) }}
      .cultivation-actions
        n-button(v-if="primaryAction === 'water'" type="primary" :disabled="locked || !ready" @click="execute") Полить
        n-button(v-if="cycle.state === 'ripe'" type="primary" :disabled="locked || !ready" @click="execute") Собрать урожай · бесплатно
        n-button(:disabled="locked" @click="preview('cancel')") {{ cycle.state === 'expired' ? 'Убрать погибший урожай' : 'Убрать посев' }}
    .cultivation-card(v-if="quote" aria-live="polite")
      h3 {{ labels[quote.action] }}
      p(v-if="quote.action !== 'cancel'") Стоимость: {{ cost }}. Списание Cr: 0.
      p(v-if="quote.action === 'cancel'") Посев будет убран без возврата семян и воды.
      p(v-for="(material, i) in materials" :key="i" :class="{ missing: !material.available }") {{ material.name }}: {{ material.have }} / {{ material.quantity }} · {{ material.available ? 'Хватает' : 'Недостаточно' }}
      p(v-if="tool" :class="{ missing: !tool.available }") {{ tool.name }}: {{ tool.durability }} прочности · {{ tool.available ? 'Доступна' : 'Нужна исправная лопата в рюкзаке' }}
      p(v-if="quote.action === 'harvest'") Будет собрано: {{ quote.value.terms.output?.quantity }} шт.
      p.missing(v-if="!canConfirm") Проверьте ресурсы, лопату и свободные ячейки склада огорода.
      n-button(v-if="quote.action === 'cancel'" type="primary" :disabled="locked || !canConfirm" @click="confirm") Убрать без возврата ресурсов
    p(v-if="calculating" role="status") Проверяем расход ресурсов…
    n-button(v-if="error && primaryAction" :disabled="locked" @click="preview(primaryAction)") Повторить расчёт
</template>
<style scoped>
.cultivation-panel { display: grid; gap: 1rem; }
.crop-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: .6rem; }.crop-tile { display: grid; gap: .4rem; padding: .8rem; border: 1px solid var(--border); border-radius: .5rem; color: var(--text); background: var(--bg-surface); text-align: left; cursor: pointer; }.crop-tile.selected { outline: 2px solid var(--primary); }.crop-tile > svg { font-size: 1.4rem; color: var(--primary); }.crop-tile span, .crop-tile small { font-size: .75rem; color: var(--text-muted); }
.cultivation-heading, .cultivation-actions { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; justify-content: space-between; }
.cultivation-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
.cultivation-card { display: grid; gap: .65rem; border: 1px solid var(--border); border-radius: .75rem; padding: 1rem; }
.cultivation-card strong { font-size: 1.35rem; }
.cultivation-card small, p { color: var(--text-muted); }
.missing { color: #e66a68; }
</style>

<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSelect } from 'naive-ui';
import { loadCultivation, loadCrops, previewCultivation, type CultivationAction } from '@/services/api/worldCultivation';
import { worldError } from '@/services/api/world';
import type { WorldQuote } from '@/entities/world/types';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
const props = defineProps<{ bedId: number; session: number; command: WorldCommandRunner }>();
const state = shallowRef<Awaited<ReturnType<typeof loadCultivation>> | null>(null), crops = shallowRef<Awaited<ReturnType<typeof loadCrops>>['items']>([]);
const error = ref(''), loading = ref(false), calculating = ref(false), selected = ref<number | null>(null), page = ref(1), pages = ref(1);
const quote = shallowRef<{ action: CultivationAction; input: Record<string, unknown>; value: WorldQuote } | null>(null);
const now = ref(Math.floor(Date.now() / 1000)); let offset = 0, generation = 0, previewGeneration = 0, disposed = false;
const labels: Record<CultivationAction, string> = { dig: 'Вскопать грядку', sow: 'Посадить семена', water: 'Полить', harvest: 'Собрать урожай', cancel: 'Убрать посев' };
const cycle = computed(() => state.value?.cycle), crop = computed(() => crops.value.find(c => c.id === selected.value));
const options = computed(() => crops.value.map(c => ({ label: c.name, value: c.id })));
const locked = computed(() => loading.value || calculating.value || props.command.busy.value || Boolean(props.command.pending.value) || !state.value?.writable);
const materials = computed(() => (quote.value?.value.terms.materials ?? []) as { name: string; required: number; available: boolean }[]);
const canConfirm = computed(() => materials.value.every(m => m.available) && (quote.value?.value.terms.output as { fits?: boolean } | undefined)?.fits !== false);
const duration = (seconds: number) => { const s = Math.max(0, Math.ceil(seconds)); return s >= 3600 ? `${Math.floor(s / 3600)} ч ${Math.floor(s % 3600 / 60)} мин` : `${Math.floor(s / 60)} мин ${s % 60} с`; };
const date = (seconds: number) => new Date(seconds * 1000).toLocaleString('ru-RU');
async function load() {
  const current = ++generation; previewGeneration++; loading.value = true; error.value = ''; quote.value = null;
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
watch([() => props.bedId, () => props.session, page], () => { state.value = null; void load(); }, { immediate: true });
watch(selected, () => { quote.value = null; previewGeneration++; calculating.value = false; });
const timer = setInterval(() => {
  const previous = now.value; now.value = Math.floor(Date.now() / 1000) + offset;
  if (cycle.value && !loading.value && [cycle.value.ready_at, cycle.value.expires_at, cycle.value.water_due_at, cycle.value.water_deadline_at].some(t => t !== null && previous < t && now.value >= t)) void load();
}, 1000);
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; clearInterval(timer); });
</script>
<template lang="pug">
section.cultivation-panel(aria-label="Грядка")
  .cultivation-heading
    div
      h2 Выращивание
      p Вскопайте землю, посадите семена и следите за сроками полива и сбора.
    n-button(size="small" :loading="loading" @click="load") Обновить
  n-alert(v-if="error" type="error") {{ error }}
  template(v-if="state")
    template(v-if="!cycle")
      .cultivation-card
        h3 {{ state.dug ? 'Грядка готова к посадке' : 'Подготовка земли' }}
        n-button(v-if="!state.dug" type="primary" :disabled="locked" @click="preview('dig')") Вскопать грядку
        template(v-else)
          n-select(v-model:value="selected" :options="options" :disabled="locked" placeholder="Выберите культуру" aria-label="Культура")
          .cultivation-actions(v-if="pages > 1")
            n-button(:disabled="page <= 1 || locked" @click="page--") Назад
            span {{ page }} / {{ pages }}
            n-button(:disabled="page >= pages || locked" @click="page++") Далее
          template(v-if="crop")
            p Семян: {{ crop.seed_quantity }} · Урожай: {{ crop.yield_quantity }} · Рост: {{ duration(crop.grow_seconds) }}
            p(v-if="crop.water_quantity") Полив каждые {{ duration(crop.water_interval_seconds) }}, окно полива — {{ duration(crop.water_window_seconds) }}.
            p Соберите урожай в течение {{ duration(crop.harvest_window_seconds) }} после созревания.
          n-button(type="primary" :disabled="locked || !selected" @click="preview('sow')") Посадить семена
      p Семена и вода расходуются из рюкзака. Урожай также попадёт в рюкзак.
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
        n-button(v-if="cycle.can_water" type="primary" :disabled="locked" @click="preview('water')") Полить
        n-button(v-if="cycle.state === 'ripe'" type="primary" :disabled="locked" @click="preview('harvest')") Собрать урожай
        n-button(:disabled="locked" @click="preview('cancel')") {{ cycle.state === 'expired' ? 'Убрать погибший урожай' : 'Убрать посев' }}
    .cultivation-card(v-if="quote" aria-live="polite")
      h3 {{ labels[quote.action] }}
      p(v-if="quote.action === 'cancel'") Посев будет убран без возврата семян и воды.
      p(v-for="(material, i) in materials" :key="i" :class="{ missing: !material.available }") {{ material.name }}: {{ material.available ? 'Хватает' : 'Недостаточно' }}
      p(v-if="quote.action === 'harvest'") Будет собрано: {{ quote.value.terms.output?.quantity }} шт.
      p.missing(v-if="!canConfirm") Проверьте ресурсы и свободные места в рюкзаке.
      n-button(type="primary" :disabled="locked || !canConfirm" @click="confirm") Подтвердить
</template>
<style scoped>
.cultivation-panel { display: grid; gap: 1rem; }
.cultivation-heading, .cultivation-actions { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; justify-content: space-between; }
.cultivation-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
.cultivation-card { display: grid; gap: .65rem; border: 1px solid var(--border); border-radius: .75rem; padding: 1rem; }
.cultivation-card strong { font-size: 1.35rem; }
.cultivation-card small, p { color: var(--text-muted); }
.missing { color: #e66a68; }
</style>

<script setup lang="ts">
import { worldActionButtonTheme } from '@/entities/world/theme';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSpin } from 'naive-ui';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadHousing, previewHousing, type HousingAction } from '@/services/api/worldHousing';
import { worldError } from '@/services/api/world';
import WorldNightsPanel from './WorldNightsPanel.vue';
const props = defineProps<{ nodeId: number; session: number; command: WorldCommandRunner; writable?: boolean }>();
const state = shallowRef<Awaited<ReturnType<typeof loadHousing>> | null>(null), quote = shallowRef<Awaited<ReturnType<typeof previewHousing>> | null>(null);
const error = ref(''), loading = ref(false), calculating = ref(false), { busy, pending } = props.command;
const locked = computed(() => props.writable === false || busy.value || Boolean(pending.value) || !state.value?.writable);
const date = (value: number) => new Date(value * 1000).toLocaleString('ru-RU');
let generation = 0, previewGeneration = 0, disposed = false;
function clear() { previewGeneration++; quote.value = null; calculating.value = false; }
async function load() {
  const current = ++generation; clear(); state.value = null; loading.value = true; error.value = '';
  try { const result = await loadHousing(props.nodeId); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session], load, { immediate: true, flush: 'sync' });
watch(busy, clear, { flush: 'sync' });
async function preview(action: HousingAction) {
  if (locked.value || calculating.value) return;
  clear(); const current = previewGeneration; calculating.value = true; error.value = '';
  try { const result = await previewHousing(props.nodeId, action); if (!disposed && current === previewGeneration) quote.value = result; }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
async function confirm() {
  if (!quote.value || locked.value) return;
  const selected = quote.value;
  const current = generation;
  await props.command.submit(`/nodes/${props.nodeId}/housing-${selected.action}`, {}, selected.quote);
  if (!disposed && current === generation && !pending.value) void load();
}
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.world-housing#housing
  h2 Ночлег
  n-button(:theme-overrides="worldActionButtonTheme" :loading="loading" :disabled="busy || Boolean(pending)" @click="load") Обновить ночлег
  n-alert(closable v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка жилья")
  template(v-else-if="state")
    p(v-if="!state.supported") Создайте кровать на стоянке и разместите её в открытой ячейке шалаша или помещения, чтобы оборудовать ночлег.
    template(v-else-if="state.place")
      p Для ночлега нужна установленная кровать. При её перемещении назначение ночлега прекращается.
      p Ночлег назначается отдельно и сохраняется до отмены. Плата за назначение не взимается.
      p(v-if="!state.nightsEnabled") Календарь ночей ещё не открыт. Назначение сохранится для дальнейшего расчёта.
      n-alert(closable v-if="!state.active" type="warning") Место сейчас недоступно для нового ночлега.
      template(v-if="state.lodging")
        p Ночлег назначен с {{ date(state.lodging.assigned_at) }}. {{ state.lodging.protects_now ? 'Укрытие защищает от непогоды.' : 'Укрытие сейчас не обеспечивает защиту.' }}
        n-button(:theme-overrides="worldActionButtonTheme" :disabled="locked || calculating" @click="preview('leave')") Отменить ночлег
      template(v-else-if="state.current")
        p Сначала отмените назначение в другом месте: {{ state.current.kind === 'shelter' ? 'шалаш' : 'кровать в другом объекте' }}.
        router-link(:to="`/world/nodes/${state.current.node_id}#${state.current.kind === 'shelter' ? 'shelter' : 'housing'}`") Открыть текущее место ночлега
      n-button(:theme-overrides="worldActionButtonTheme" v-else :disabled="locked || calculating || !state.active" @click="preview('lodge')") Назначить ночлег
      world-nights-panel(:node-id="state.place.plot_id" :session="session")
    section(v-if="quote" aria-live="polite")
      h3 {{ quote.action === 'lodge' ? 'Назначить ночлег здесь' : 'Прекратить ночлег здесь' }}
      p Без оплаты. Изменение начнёт действовать после подтверждения.
      p Для защищённой ночи нужно оставаться в одном исправном укрытии всю ночь. Назначение не восстанавливает здоровье за прошлые ночи.
      n-button(:theme-overrides="worldActionButtonTheme" type="primary" :disabled="locked" @click="confirm") Подтвердить
</template>
<style scoped>
.world-housing { display: grid; gap: .75rem; }
</style>

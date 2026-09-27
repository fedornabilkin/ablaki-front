<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSpin } from 'naive-ui';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadHousing, previewHousing, type HousingAction } from '@/services/api/worldHousing';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; session: number; command: WorldCommandRunner }>();
const state = shallowRef<Awaited<ReturnType<typeof loadHousing>> | null>(null), quote = shallowRef<Awaited<ReturnType<typeof previewHousing>> | null>(null);
const error = ref(''), loading = ref(false), calculating = ref(false), { busy, pending } = props.command;
const locked = computed(() => busy.value || Boolean(pending.value) || !state.value?.writable);
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
  await props.command.submit(`/nodes/${props.nodeId}/housing-${selected.action}`, {}, selected.quote);
  if (!disposed && !pending.value) void load();
}
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.world-housing#housing
  h2 Ночлег в доме
  n-button(:loading="loading" :disabled="busy || Boolean(pending)" @click="load") Обновить ночлег
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка жилья")
  template(v-else-if="state")
    p(v-if="!state.supported") Это помещение не включает спальное место. Дом с койкой можно купить на своей стоянке.
    template(v-else-if="state.place")
      p В комнату включена одна постоянная койка. Она занимает отдельную площадь и не уменьшает купленные места станций и сундуков.
      p Ночлег назначается отдельно и сохраняется до отмены. Плата за назначение не взимается.
      p(v-if="!state.nightsEnabled") Календарь ночей ещё не открыт. Назначение сохранится для дальнейшего расчёта.
      n-alert(v-if="!state.active" type="warning") Дом сейчас недоступен для нового ночлега.
      template(v-if="state.lodging")
        p Ночлег назначен с {{ date(state.lodging.assigned_at) }}. {{ state.lodging.protects_now ? 'Дом защищает от непогоды.' : 'Дом сейчас не обеспечивает защиту.' }}
        n-button(:disabled="locked || calculating" @click="preview('leave')") Отменить ночлег
      template(v-else-if="state.current")
        p Сначала отмените назначение в другом месте: {{ state.current.kind === 'shelter' ? 'шалаш' : 'дом' }}.
        router-link(:to="`/world/nodes/${state.current.node_id}#${state.current.kind === 'shelter' ? 'shelter' : 'housing'}`") Открыть текущее место ночлега
      n-button(v-else :disabled="locked || calculating || !state.active" @click="preview('lodge')") Назначить ночлег
      router-link(:to="`/world/nodes/${state.place.plot_id}#nights`") Здоровье и история ночей на стоянке
    section(v-if="quote" aria-live="polite")
      h3 {{ quote.action === 'lodge' ? 'Назначить ночлег в доме' : 'Прекратить ночлег в доме' }}
      p Стоимость: 0 Cr. Изменение начнёт действовать после подтверждения.
      p Для защищённой ночи нужно оставаться в одном исправном укрытии всю ночь. Покупка дома и назначение не восстанавливают здоровье за прошлые ночи.
      n-button(type="primary" :disabled="locked" @click="confirm") Подтвердить
</template>
<style scoped>
.world-housing { display: grid; gap: .75rem; }
</style>

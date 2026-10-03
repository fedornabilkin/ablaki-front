<script setup lang="ts">
import { formatCredits } from '@/entities/world/credits';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSpin } from 'naive-ui';
import { RouterLink } from 'vue-router';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadBuildingRepair, previewBuildingRepair } from '@/services/api/worldBuildingRepair';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; session: number; writable: boolean; command: WorldCommandRunner }>();
const state = shallowRef<Awaited<ReturnType<typeof loadBuildingRepair>> | null>(null), quote = shallowRef<Awaited<ReturnType<typeof previewBuildingRepair>> | null>(null);
const loading = ref(false), calculating = ref(false), error = ref(''), { busy, pending } = props.command;
const locked = computed(() => busy.value || Boolean(pending.value) || !props.writable || !state.value?.writable || !state.value?.available);
let generation = 0, previewGeneration = 0, disposed = false;
function clear() { previewGeneration++; quote.value = null; calculating.value = false; }
async function load() {
  const current = ++generation; clear(); loading.value = true; state.value = null; error.value = '';
  try { const value = await loadBuildingRepair(props.nodeId); if (!disposed && current === generation) state.value = value; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session], load, { immediate: true, flush: 'sync' });
watch([busy, () => props.writable], clear, { flush: 'sync' });
async function preview() {
  if (locked.value || calculating.value || loading.value) return;
  clear(); const current = previewGeneration; calculating.value = true; error.value = '';
  try { const value = await previewBuildingRepair(props.nodeId); if (!disposed && current === previewGeneration) quote.value = value; }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
function confirm() {
  if (!quote.value || locked.value || loading.value || calculating.value) return;
  void props.command.submit(`/nodes/${quote.value.node}/building-repair`, {}, quote.value.quote);
}
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.world-building-repair#building-repair
  h2 Ремонт постройки
  n-button(:loading="loading" :disabled="busy || Boolean(pending)" @click="load") Обновить расчёт
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка условий ремонта")
  template(v-else-if="state")
    p(v-if="state.supported && !state.writable") Платные действия мира сейчас недоступны.
    p Свободный бюджет постройки: {{ formatCredits(state.budget) }} Cr. Пополнить его можно в разделе бюджета этого здания.
    template(v-if="state.repair")
      p Прочность: {{ state.repair.condition_before }} / {{ state.repair.condition_after }}. Ремонт: {{ formatCredits(state.repair.price) }} Cr.
      p Материалы из доступных ячеек рюкзака:
      ul
        li(v-for="item in state.repair.materials" :key="item.item_id" :class="{ missing: !item.available }") {{ item.name }}: нужно {{ item.quantity }}, есть {{ item.have }}{{ item.available ? '' : ' — недостаточно' }}
    ul(v-if="state.reasons.length")
      li(v-for="reason in state.reasons" :key="reason") {{ reason }}
    n-button(v-if="state.supported" :disabled="locked || calculating" :loading="calculating" @click="preview") Рассчитать ремонт…
  n-alert(v-if="quote" type="info" aria-live="polite")
    h3 Ремонт: {{ quote.name }}
    p Прочность: {{ quote.repair.condition_before }} → {{ quote.repair.condition_after }}.
    p Из бюджета здания: {{ formatCredits(quote.repair.price) }} Cr. Свободно до ремонта: {{ formatCredits(quote.budget) }} Cr. Личный баланс не списывается.
    p
      | Получатель — казна поселения:
      |  
      router-link(:to="`/world/nodes/${quote.recipient.id}`") {{ quote.recipient.name }}
    ul
      li(v-for="item in quote.repair.materials" :key="item.item_id") {{ item.name }}: {{ item.quantity }}
    p Ремонт завершится сразу после подтверждения. Цена и материалы рассчитаны по повреждению с округлением вверх.
    p(v-if="quote.statusAfter === 'paused'") Здание останется на паузе. Затем возобновите его работу и назначьте ночлег, если нужно.
    p(v-else) Постройка продолжит работу, назначенный ночлег сохранится.
    n-button(type="primary" :disabled="locked" @click="confirm") Подтвердить ремонт
    n-button(:disabled="busy" @click="clear") Отмена
</template>
<style scoped>
.world-building-repair { display: grid; gap: .75rem; }
.missing { color: var(--error-color, #d03050); }
</style>

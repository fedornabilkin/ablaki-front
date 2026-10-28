<script setup lang="ts">
import { worldActionButtonTheme } from '@/entities/world/theme';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSpin } from 'naive-ui';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadHousing, previewHousing, type HousingAction } from '@/services/api/worldHousing';
import { worldError } from '@/services/api/world';
import WorldNightsPanel from './WorldNightsPanel.vue';
import WorldHelpHint from './WorldHelpHint.vue';
const props = defineProps<{ nodeId: number; session: number; command: WorldCommandRunner; writable?: boolean }>();
const state = shallowRef<Awaited<ReturnType<typeof loadHousing>> | null>(null);
const error = ref(''), receipt = ref(''), loading = ref(false), calculating = ref(false), { busy, pending } = props.command;
const locked = computed(() => props.writable === false || busy.value || Boolean(pending.value) || !state.value?.writable);
const date = (value: number) => new Date(value * 1000).toLocaleString('ru-RU');
let generation = 0, disposed = false;
async function load() {
  const current = ++generation; state.value = null; loading.value = true; calculating.value = false; error.value = '';
  try { const result = await loadHousing(props.nodeId); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session], () => { receipt.value = ''; void load(); }, { immediate: true, flush: 'sync' });
async function act(action: HousingAction) {
  if (locked.value || calculating.value) return;
  const current = generation, node = props.nodeId, session = props.session; calculating.value = true; error.value = ''; receipt.value = '';
  try {
    const selected = await previewHousing(props.nodeId, action, action === 'lodge');
    if (disposed || current !== generation || props.writable === false || busy.value || pending.value) return;
    const result = await props.command.submit(`/nodes/${props.nodeId}/housing-${selected.action}`, selected.input, selected.quote);
    if (result && !disposed && current === generation) { receipt.value = action === 'lodge' ? 'Ночлег назначен.' : 'Ночлег отменён.'; await load(); }
  } catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && node === props.nodeId && session === props.session) calculating.value = false; }
}
onScopeDispose(() => { disposed = true; generation++; });
</script>
<template lang="pug">
section.world-housing#housing
  .housing-heading
    h3 Ночлег
    world-help-hint(label="Как назначается ночлег")
      p Разместите кровать в исправном крытом объекте и назначьте ночлег одним нажатием. Плата не взимается; прежний ночлег при смене закрывается в той же операции.
      p Назначение сохраняется до отмены или перемещения кровати. Для защиты нужно оставаться в одном исправном укрытии всю ночь; прошлые ночи и здоровье не пересчитываются.
      p(v-if="state && !state.nightsEnabled") Календарь ночей ещё не открыт. Назначение сохранится для дальнейшего расчёта.
      n-button(:theme-overrides="worldActionButtonTheme" :loading="loading" :disabled="busy || Boolean(pending)" @click="load") Обновить ночлег
  n-alert(closable v-if="error" type="error" role="alert") {{ error }}
  n-alert(v-if="receipt" type="success" closable @close="receipt = ''") {{ receipt }}
  n-spin(v-if="loading" aria-label="Загрузка жилья")
  template(v-else-if="state")
    p(v-if="!state.supported") Создайте кровать на стоянке и разместите её в открытой ячейке шалаша или помещения, чтобы оборудовать ночлег.
    template(v-else-if="state.place")
      n-alert(closable v-if="!state.active" type="warning") Место сейчас недоступно для нового ночлега.
      template(v-if="state.lodging")
        p Ночлег назначен с {{ date(state.lodging.assigned_at) }}. {{ state.lodging.protects_now ? 'Укрытие защищает от непогоды.' : 'Укрытие сейчас не обеспечивает защиту.' }}
        n-button(:theme-overrides="worldActionButtonTheme" :loading="calculating || busy" :disabled="locked || calculating" @click="act('leave')") Отменить ночлег
      n-button(:theme-overrides="worldActionButtonTheme" v-else type="primary" :loading="calculating || busy" :disabled="locked || calculating || !state.active" @click="act('lodge')") Назначить ночлег
      world-nights-panel(:node-id="state.place.plot_id" :session="session")
</template>
<style scoped>
.world-housing { display: grid; gap: .75rem; }
.housing-heading { display: flex; align-items: start; justify-content: space-between; gap: .75rem; }.housing-heading h3 { margin: 0; }
</style>

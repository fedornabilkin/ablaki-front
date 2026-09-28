<script setup lang="ts">
import { onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSpin } from 'naive-ui';
import { loadCampsiteSupplies, previewCampsiteSupplies, type SupplyAction } from '@/services/api/worldCampsite';
import { worldError } from '@/services/api/world';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';

const props = defineProps<{ nodeId: number; session: number; command: WorldCommandRunner }>();
const state = shallowRef<Awaited<ReturnType<typeof loadCampsiteSupplies>> | null>(null);
const preview = shallowRef<Awaited<ReturnType<typeof previewCampsiteSupplies>> | null>(null);
const selected = ref<SupplyAction | null>(null), loading = ref(false), error = ref('');
let generation = 0;
async function load() {
  const current = ++generation; state.value = null; preview.value = null; selected.value = null; error.value = ''; loading.value = true;
  try { const result = await loadCampsiteSupplies(props.nodeId); if (current === generation) state.value = result; }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) loading.value = false; }
}
async function calculate(action: SupplyAction) {
  if (loading.value || props.command.pending.value) return;
  const current = ++generation; selected.value = action; preview.value = null; error.value = ''; loading.value = true;
  try { const result = await previewCampsiteSupplies(props.nodeId, action); if (current === generation) preview.value = result; }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) loading.value = false; }
}
function confirm() {
  if (preview.value && selected.value) void props.command.submit(`/nodes/${props.nodeId}/supplies-${selected.value}`, {}, preview.value.quote);
}
watch([() => props.nodeId, () => props.session], () => { void load(); }, { immediate: true });
onScopeDispose(() => { generation++; });
const date = (value: number) => new Date(value * 1000).toLocaleString('ru-RU');
</script>
<template lang="pug">
section.world-supplies#supplies(aria-label="Материалы стоянки")
  h2 Сбор материалов
  p Стартовый набор можно получить один раз. Обычные материалы собираются каждый день на своей стоянке.
  n-button(size="small" :loading="loading" @click="load") Обновить
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка материалов")
  template(v-else-if="state")
    .supply-actions
      n-button(:disabled="!state.starterAvailable || Boolean(command.pending.value)" @click="calculate('starter')") {{ state.starterAvailable ? 'Рассчитать стартовый набор' : 'Стартовый набор получен' }}
      n-button(:disabled="!state.gatherAvailable || Boolean(command.pending.value)" @click="calculate('gather')") {{ state.gatherAvailable ? 'Рассчитать сегодняшний сбор' : 'Сегодня уже собрано' }}
    p(v-if="!state.gatherAvailable") Следующий сбор: {{ date(state.gatherAvailableAt) }}.
    section.supply-quote(v-if="preview && selected" aria-live="polite")
      h3 {{ selected === 'starter' ? 'Стартовый набор' : 'Сегодняшний сбор' }}
      p(v-if="preview.efficiency < 10000") Эффективность сбора: {{ preview.efficiency / 100 }}% с учётом здоровья.
      ul
        li(v-for="item in preview.items" :key="item.id") {{ item.name || `Материал №${item.id}` }} · {{ item.quantity }} шт.
      n-button(type="primary" :loading="command.busy.value" :disabled="Boolean(command.pending.value)" @click="confirm") Получить материалы
</template>
<style scoped>
.world-supplies { display: grid; gap: .75rem; padding: 1rem; border: 1px solid var(--border); border-radius: .6rem; background: var(--bg-surface); }
.supply-actions { display: flex; flex-wrap: wrap; gap: .75rem; }
.supply-quote { display: grid; gap: .5rem; padding: 1rem; border: 1px solid var(--primary); border-radius: .5rem; }
.supply-quote ul { margin: 0; padding-left: 1.5rem; }
</style>

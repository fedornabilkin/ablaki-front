<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NPopover, NModal, NButton, NProgress, NAlert } from 'naive-ui';
import { worldModalTheme, worldActionButtonTheme } from '@/entities/world/theme';
import CraftGatherButton from '../craft/CraftGatherButton.vue';
import { gatherState } from '@/services/api/simpleWorld';
import { useGatherCountdown, type GatherState } from '@/hooks/useGatherCountdown';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; owner: number; session: number; revision: number; writable: boolean }>();
const emit = defineEmits<{ changed: [] }>();
const state = ref<GatherState | null>(null), error = ref(''), open = ref(false), receipt = ref('');
const progress = computed(() => state.value?.gather_limit ? Math.round(100 * (state.value.gather_remaining ?? 0) / state.value.gather_limit) : 0);
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.${props.nodeId}.hero-gather`), computed(() => props.session));
let generation = 0, disposed = false;
async function load() {
  const current = ++generation;
  try {
    const next = await gatherState(props.nodeId);
    if (!disposed && current === generation) { state.value = next; error.value = ''; }
  } catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
}
const countdown = useGatherCountdown(state, load);
async function gather() {
  error.value = ''; const current = props.session, id = props.nodeId;
  const result = runner.pending.value ? await runner.retry() : await runner.submit(`objects/${id}/gather`);
  if (!result || disposed || current !== props.session || id !== props.nodeId) return;
  receipt.value = Array.isArray(result.gathered_items) ? result.gathered_items.map(item => { const row = item as {name?: string; quantity?: number}; return `${row.name ?? 'Сырьё'} ×${row.quantity ?? 0}`; }).join(', ') : 'Сырьё добавлено в рюкзак.';
  if (typeof result.gather_available === 'boolean') state.value = { gather_available: result.gather_available, gather_available_at: Number(result.gather_available_at), server_time: Number(result.server_time),
    ...(typeof result.gather_remaining === 'number' ? {gather_remaining: result.gather_remaining} : {}),
    ...(typeof result.gather_limit === 'number' ? {gather_limit: result.gather_limit} : {}),
    ...(typeof result.gather_exhausted === 'boolean' ? {gather_exhausted: result.gather_exhausted} : {}) };
  emit('changed'); void load();
}
watch([() => props.nodeId, () => props.session], () => { state.value = null; error.value = ''; open.value = false; receipt.value = ''; }, { flush: 'sync' });
watch([() => props.nodeId, () => props.session, () => props.revision], load, { immediate: true });
onScopeDispose(() => { disposed = true; generation++; });
</script>
<template lang="pug">
.world-hero-gather
  craft-gather-button.world-action(:available="state?.gather_available ?? true" :remaining="state?.gather_remaining" :limit="state?.gather_limit" :exhausted="state?.gather_exhausted" :disabled="!state || !writable || runner.busy.value" :countdown="countdown" @gather="open = true")
  span.gather-feedback
    n-popover(v-if="error || runner.error.value || runner.pending.value" trigger="click" placement="bottom")
      template(#trigger)
        button.gather-error(:class="{ 'world-action': !!runner.pending.value }" type="button" :aria-label="runner.pending.value ? 'Повторить сбор сырья' : 'Ошибка сбора сырья'" :disabled="runner.busy.value" @click="runner.pending.value && !runner.busy.value ? gather() : undefined")
          font-awesome-icon(:icon="runner.busy.value ? 'spinner' : 'exclamation-circle'" :spin="runner.busy.value")
      | {{ error || runner.error.value || 'Ответ ещё не получен. Нажмите, чтобы повторить тот же запрос.' }}
  n-modal(v-model:show="open" :theme-overrides="worldModalTheme" preset="card" title="Ежедневный сбор сырья" :style="{ width: 'min(32rem, 94vw)' }")
    n-alert.gather-receipt(v-if="receipt" type="success" closable @close="receipt = ''") Получено: {{ receipt }}
    p Собирайте сырьё до постройки добычи: соответствующий ресурс после неё исчезает из снабжения. Каждая выдача меньше предыдущей. Исчерпанный ресурс не возобновляется; новый предмет каталога получает собственный запас.
    p Осталось сборов: {{ state?.gather_remaining ?? 0 }} / {{ state?.gather_limit ?? 0 }}
    n-progress(type="line" :percentage="progress" :show-indicator="false")
    ul.gather-items
      li(v-for="item in state?.gather_items ?? []" :key="item.name")
        span {{ item.name }}
        strong ×{{ item.quantity }}
    n-alert(v-if="state?.gather_reason || runner.error.value" type="warning" closable) {{ state?.gather_reason || runner.error.value }}
    n-button(:theme-overrides="worldActionButtonTheme" type="primary" :loading="runner.busy.value" :disabled="!writable || runner.busy.value || (!runner.pending.value && (!state?.gather_available || state?.gather_can_claim === false))" @click="gather") {{ runner.pending.value ? 'Повторить запрос' : 'Собрать в рюкзак' }}
</template>
<style scoped>
.gather-receipt { margin-bottom: 1rem; }
.gather-items { padding: 0; list-style: none; display: grid; gap: .4rem; }.gather-items li { display: flex; justify-content: space-between; gap: 1rem; padding: .4rem .6rem; background: var(--bg-surface); border-radius: .4rem; }
.world-hero-gather { display: flex; align-items: flex-start; gap: .4rem; }.gather-feedback { flex: 0 0 1.2rem; width: 1.2rem; }.gather-error { border: 0; background: transparent; color: #e66a68; cursor: pointer; padding: 0; }
</style>

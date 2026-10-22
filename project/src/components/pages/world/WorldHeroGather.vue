<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NPopover } from 'naive-ui';
import CraftGatherButton from '../craft/CraftGatherButton.vue';
import { gatherState } from '@/services/api/simpleWorld';
import { useGatherCountdown, type GatherState } from '@/hooks/useGatherCountdown';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; owner: number; session: number; revision: number; writable: boolean }>();
const emit = defineEmits<{ changed: [] }>();
const state = ref<GatherState | null>(null), error = ref('');
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
  if (typeof result.gather_available === 'boolean') state.value = { gather_available: result.gather_available, gather_available_at: Number(result.gather_available_at), server_time: Number(result.server_time),
    ...(typeof result.gather_remaining === 'number' ? {gather_remaining: result.gather_remaining} : {}),
    ...(typeof result.gather_limit === 'number' ? {gather_limit: result.gather_limit} : {}),
    ...(typeof result.gather_exhausted === 'boolean' ? {gather_exhausted: result.gather_exhausted} : {}) };
  emit('changed'); void load();
}
watch([() => props.nodeId, () => props.session], () => { state.value = null; error.value = ''; }, { flush: 'sync' });
watch([() => props.nodeId, () => props.session, () => props.revision], load, { immediate: true });
onScopeDispose(() => { disposed = true; generation++; });
</script>
<template lang="pug">
.world-hero-gather
  craft-gather-button.world-action(:available="state?.gather_available ?? true" :remaining="state?.gather_remaining" :limit="state?.gather_limit" :exhausted="state?.gather_exhausted" :disabled="!state || !writable || runner.busy.value || !!runner.pending.value" :countdown="countdown" @gather="gather")
  span.gather-feedback
    n-popover(v-if="error || runner.error.value || runner.pending.value" trigger="click" placement="bottom")
      template(#trigger)
        button.gather-error(:class="{ 'world-action': !!runner.pending.value }" type="button" :aria-label="runner.pending.value ? 'Повторить сбор сырья' : 'Ошибка сбора сырья'" :disabled="runner.busy.value" @click="runner.pending.value && !runner.busy.value ? gather() : undefined")
          font-awesome-icon(:icon="runner.busy.value ? 'spinner' : 'exclamation-circle'" :spin="runner.busy.value")
      | {{ error || runner.error.value || 'Ответ ещё не получен. Нажмите, чтобы повторить тот же запрос.' }}
</template>
<style scoped>
.world-hero-gather { display: flex; align-items: flex-start; gap: .4rem; }.gather-feedback { flex: 0 0 1.2rem; width: 1.2rem; }.gather-error { border: 0; background: transparent; color: #e66a68; cursor: pointer; padding: 0; }
</style>

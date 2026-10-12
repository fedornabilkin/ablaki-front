<script setup lang="ts">
import { worldActionButtonTheme } from '@/entities/world/theme';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton } from 'naive-ui';
import { loadMining, parseMining, type MiningState } from '@/services/api/worldMining';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { worldError } from '@/services/api/world';
import { formatDuration } from '@/entities/world/duration';
const props = defineProps<{ nodeId: number; owner: number; session: number; writable: boolean }>();
const state = ref<MiningState | null>(null), error = ref('');
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.${props.nodeId}.mining`), computed(() => props.session));
let generation = 0, disposed = false, reading = false;
async function load() {
  const current = generation; reading = true;
  try { const result = await loadMining(props.nodeId); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { reading = false; }
}
async function act(action: 'start' | 'heartbeat' | 'stop', retry = false) {
  const current = generation; error.value = '';
  const result = retry ? await runner.retry() : await runner.submit(`objects/${props.nodeId}/mining/${action}`, {});
  if (result && !disposed && current === generation) { try { state.value = parseMining(result); } catch (cause) { error.value = worldError(cause); } }
}
watch(() => [props.nodeId, props.session], () => { generation++; state.value = null; error.value = ''; void load(); }, { immediate: true });
const timer = setInterval(() => {
  if (runner.busy.value || runner.pending.value || reading) return;
  if (state.value?.working) void act('heartbeat'); else void load();
}, 10_000);
onScopeDispose(() => { disposed = true; generation++; clearInterval(timer); });
</script>
<template lang="pug">
section.mining-panel(aria-label="Добыча руды")
  h3 Добыча руды
  n-alert(v-if="error || runner.error.value" type="error") {{ error || runner.error.value }}
  template(v-if="state")
    p(v-if="!state.ready") Постройте буровую установку внутри шахты, чтобы начать добычу.
    template(v-else)
      p Работников: {{ state.workers }}. Добыто: {{ state.produced_quantity }} ед. руды.
      p Одна единица за {{ formatDuration(state.seconds_per_unit) }} труда. Руда поступает в склад шахты, а без него — в рюкзак владельца.
      p(v-if="state.pending_quantity") Ожидает выдачи: {{ state.pending_quantity }}. Освободите место в хранилище.
      n-button(:theme-overrides="worldActionButtonTheme" v-if="!state.working" type="primary" :loading="runner.busy.value" :disabled="!writable || !!runner.pending.value" @click="act('start')") Добывать руду
      n-button(:theme-overrides="worldActionButtonTheme" v-else :loading="runner.busy.value" :disabled="!!runner.pending.value" @click="act('stop')") Приостановить добычу
      p Работа учитывается при открытой странице и связи с сервером; после обрыва — не более 60 секунд.
  n-button(:theme-overrides="worldActionButtonTheme" v-if="runner.pending.value" :loading="runner.busy.value" @click="act('heartbeat', true)") Повторить запрос
</template>
<style scoped>
.mining-panel { display: grid; gap: .75rem; }.mining-panel p, .mining-panel h3 { margin: 0; }
</style>

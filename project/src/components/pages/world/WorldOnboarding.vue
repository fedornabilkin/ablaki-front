<script setup lang="ts">
import { onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton } from 'naive-ui';
import { loadWorldOnboarding, previewWorldJoin, worldError } from '@/services/api/world';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import type { WorldNode, WorldOnboarding, WorldQuote } from '@/entities/world/types';
const props = defineProps<{ node: WorldNode; writable: boolean; command: WorldCommandRunner; session: number }>();
const state = shallowRef<WorldOnboarding | null>(null), quote = shallowRef<WorldQuote | null>(null), error = ref(''), loading = ref(false);
let generation = 0, disposed = false;
const runner = props.command;
const { busy, pending } = runner;
async function load() {
  const current = ++generation; state.value = null; quote.value = null; error.value = ''; loading.value = true;
  try { const result = await loadWorldOnboarding(); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
async function preview() {
  const current = ++generation; error.value = ''; loading.value = true;
  try { const result = await previewWorldJoin(props.node.id); if (!disposed && current === generation) quote.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.node.id, () => props.session], load, { immediate: true });
onScopeDispose(() => { disposed = true; generation++; });
function join() { if (quote.value) void runner.submit('/onboarding/join', { settlement_id: props.node.id }, quote.value); }
</script>
<template lang="pug">
section.world-onboarding(v-if="!state?.joined" aria-label="Начало жизни в мире")
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  template(v-if="state && node.type === 'SETTLEMENT'")
    p Здесь можно начать жизнь в мире и получить место для усадьбы.
    n-button(v-if="!quote" :disabled="!writable || !state.join_available || Boolean(pending)" :loading="loading" @click="preview") Выбрать поселение
    template(v-else)
      p Начать в поселении «{{ node.label }}»? Усадьба предоставляется один раз, бесплатно.
      n-button(type="primary" :disabled="!writable || Boolean(pending)" :loading="busy" @click="join") Начать
  p(v-else-if="state && !state.joined") Выберите город или деревню, в которых хотите начать.
</template>
<style scoped>
.world-onboarding { display: grid; gap: .75rem; }
</style>

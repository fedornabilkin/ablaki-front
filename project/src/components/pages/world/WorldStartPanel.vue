<script setup lang="ts">
import { worldActionButtonTheme } from '@/entities/world/theme';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton } from 'naive-ui';
import { startState, build, node as parseNode, type SimpleNode, type Build } from '@/services/api/simpleWorld';
import BuildSettingsModal from './modals/BuildSettingsModal.vue';
import { worldError } from '@/services/api/world';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import type { WorldNode } from '@/entities/world/types';
const props = defineProps<{ node: WorldNode; writable: boolean; owner: number; session: number }>();
const emit = defineEmits<{ changed: [] }>();
const router = useRouter(), home = ref<SimpleNode | null>(null), ready = ref(false), error = ref(''), message = ref('');
const project = ref<Build | null>(null), open = ref(false), projectName = ref('');
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.${props.node.id}.onboarding`), computed(() => props.session));
let generation = 0;
watch(() => [props.node.id, props.session], async () => {
  const current = ++generation; ready.value = false; home.value = null; error.value = ''; message.value = '';
  try { const result = await startState(); if (current === generation) { home.value = result; ready.value = true; } }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
}, { immediate: true });
async function act(kind: 'start' | 'retry') {
  const current = generation;
  if (kind === 'start') { project.value = null; projectName.value = 'Стоянка'; open.value = true; }
  const result = kind === 'retry' ? await runner.retry() : await runner.submit('start', { city_id: props.node.id });
  if (!result || current !== generation) return;
  if (typeof result.message === 'string') message.value = result.message;
  emit('changed');
  if (result.node && result.build) { home.value = parseNode(result.node); project.value = build(result.build); projectName.value = home.value.name; open.value = true; }
  else if (result.node) await router.push({ path: `/world/nodes/${parseNode(result.node).id}`, hash: '#map' });
}
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
section.world-start(v-if="error || runner.error.value || runner.pending.value || (ready && !home) || open" aria-label="Начало жизни и ресурсы")
  n-alert(v-if="error || runner.error.value" type="error" role="alert") {{ error || runner.error.value }}
  n-alert(v-if="message" type="success") {{ message }}
  n-button(:theme-overrides="worldActionButtonTheme" v-if="runner.pending.value && !runner.busy.value" @click="act('retry')") Повторить запрос
  template(v-if="ready && !home")
    template(v-if="node.type === 'SETTLEMENT'")
      h2 Начало игры
      p Получите доски, инструменты, семена и эликсир. Обустройте стоянку, затем постройте шалаш, огород или шахту.
      n-button.start-button(:theme-overrides="worldActionButtonTheme" size="small" type="primary" :disabled="!writable || !!runner.pending.value" :loading="runner.busy.value" @click="act('start')") Начать здесь
    p(v-else) Выберите город или деревню, в которых хотите начать.
  build-settings-modal(v-model:show="open" :project="project" :name="projectName" :owner="owner" :session="session" :creating="runner.busy.value" :creation-error="runner.error.value" navigate @saved="emit('changed')")
</template>
<style scoped>
.world-start { display: grid; gap: .75rem; }
.start-button { justify-self: start; }
</style>

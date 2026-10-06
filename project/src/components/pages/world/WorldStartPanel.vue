<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton } from 'naive-ui';
import { startState, node as parseNode, type SimpleNode } from '@/services/api/simpleWorld';
import { worldError } from '@/services/api/world';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import type { WorldNode } from '@/entities/world/types';
const props = defineProps<{ node: WorldNode; writable: boolean; owner: number; session: number }>();
const emit = defineEmits<{ changed: [] }>();
const router = useRouter(), home = ref<SimpleNode | null>(null), ready = ref(false), error = ref(''), message = ref('');
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.${props.node.id}.onboarding`), computed(() => props.session));
const canGather = computed(() => props.node.owned_by_me && props.node.status === 'active' && (props.node.details.plot_kind === 'campsite' || props.node.details.building_kind === 'mine'));
let generation = 0;
watch(() => [props.node.id, props.session], async () => {
  const current = ++generation; ready.value = false; home.value = null; error.value = ''; message.value = '';
  try { const result = await startState(); if (current === generation) { home.value = result; ready.value = true; } }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
}, { immediate: true });
async function act(kind: 'start' | 'gather' | 'retry') {
  const current = generation;
  const result = kind === 'retry' ? await runner.retry() : await runner.submit(kind === 'start' ? 'start' : `objects/${props.node.id}/gather`, kind === 'start' ? { city_id: props.node.id } : {});
  if (!result || current !== generation) return;
  if (typeof result.message === 'string') message.value = result.message;
  emit('changed');
  if (result.node) await router.push({ path: `/world/nodes/${parseNode(result.node).id}`, hash: '#development' });
}
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
section.world-start(v-if="error || (ready && !home) || canGather" aria-label="Начало жизни и ресурсы")
  n-alert(v-if="error || runner.error.value" type="error" role="alert") {{ error || runner.error.value }}
  n-alert(v-if="message" type="success") {{ message }}
  n-button(v-if="runner.pending.value" :loading="runner.busy.value" @click="act('retry')") Повторить запрос
  template(v-if="ready && !home")
    template(v-if="node.type === 'SETTLEMENT'")
      h2 Начало игры
      p Получите доски, инструменты, семена и эликсир. Обустройте стоянку, затем постройте шалаш, огород или шахту.
      n-button(type="primary" :disabled="!writable || !!runner.pending.value" :loading="runner.busy.value" @click="act('start')") Начать здесь
    p(v-else) Выберите город или деревню, в которых хотите начать.
  template(v-if="canGather")
    h2 Добыча ресурсов
    p {{ node.details.building_kind === 'mine' ? 'Получите руду, уголь и камень. Нужна кирка в рюкзаке.' : 'Соберите древесину, камень, воду и волокна для простых построек и инструментов.' }}
    p Ресурсы можно получить один раз в день.
    n-button(:disabled="!writable || !!runner.pending.value" :loading="runner.busy.value" @click="act('gather')") Собрать ресурсы
</template>
<style scoped>
.world-start { display: grid; gap: .75rem; }
</style>

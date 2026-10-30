<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import { NAlert, NSpin } from 'naive-ui';
import { object, type SimpleNode } from '@/services/api/simpleWorld';
import { worldError } from '@/services/api/world';
import SimpleBuildPanel from './SimpleBuildPanel.vue';
const props = withDefaults(defineProps<{ nodeId: number; revision: number; owner: number; session: number; templateId?: number; embedded?: boolean; active?: boolean; showResult?: boolean }>(), { active: true, showResult: true });
const emit = defineEmits<{ changed: [] }>();
const node = ref<SimpleNode | null>(null), error = ref('');
let generation = 0;
watch([() => props.nodeId, () => props.revision, () => props.session, () => props.active], async () => {
  const current = ++generation; if (node.value?.id !== props.nodeId) node.value = null; error.value = '';
  if (!props.active) return;
  try { const result = await object(props.nodeId); if (current === generation) node.value = result; }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
}, { immediate: true });
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
n-alert(closable v-if="error" type="error" role="alert") {{ error }}
simple-build-panel(v-else-if="node" :node="node" :owner="owner" :session="session" :template-id="templateId" :embedded="embedded" :active="active" :show-result="showResult" @changed="emit('changed')")
n-spin(v-else aria-label="Загрузка строительства")
</template>

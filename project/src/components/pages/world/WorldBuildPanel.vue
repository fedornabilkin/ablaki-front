<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import { NAlert, NSpin } from 'naive-ui';
import { object, type SimpleNode } from '@/services/api/simpleWorld';
import { worldError } from '@/services/api/world';
import SimpleBuildPanel from './SimpleBuildPanel.vue';
const props = defineProps<{ nodeId: number; revision: number; owner: number; session: number }>();
const emit = defineEmits<{ changed: [] }>();
const node = ref<SimpleNode | null>(null), error = ref('');
let generation = 0;
watch(() => [props.nodeId, props.revision, props.session], async () => {
  const current = ++generation; node.value = null; error.value = '';
  try { const result = await object(props.nodeId); if (current === generation) node.value = result; }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
}, { immediate: true });
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
n-alert(v-if="error" type="error" role="alert") {{ error }}
simple-build-panel(v-else-if="node" :node="node" :owner="owner" :session="session" @changed="emit('changed')")
n-spin(v-else aria-label="Загрузка строительства")
</template>

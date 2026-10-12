<script setup lang="ts">
import { worldActionButtonTheme } from '@/entities/world/theme';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton } from 'naive-ui';
import type { WorldNode } from '@/entities/world/types';
import { build, type Build } from '@/services/api/simpleWorld';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import BuildSettingsModal from './modals/BuildSettingsModal.vue';
const props = defineProps<{ node: WorldNode; owner: number; session: number; writable: boolean }>();
const emit = defineEmits<{ changed: [] }>();
const project = ref<Build | null>(null), open = ref(false);
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.${props.node.id}.repair`), computed(() => props.session));
const damaged = computed(() => props.node.owned_by_me && props.node.status === 'active' && Number(props.node.details.condition) < Number(props.node.details.max_condition));
let disposed = false;
watch(() => [props.node.id, props.session], () => { open.value = false; project.value = null; });
onScopeDispose(() => { disposed = true; });
async function repair(retry = false) {
  const id = props.node.id, session = props.session; open.value = true;
  const result = retry ? await runner.retry() : await runner.submit(`objects/${id}/repair`);
  if (!result || disposed || id !== props.node.id || session !== props.session) return;
  if (result.build) project.value = build(result.build);
  emit('changed');
}
</script>
<template lang="pug">
section.world-repair(v-if="damaged && !node.details.repair_active")
  n-button(:theme-overrides="worldActionButtonTheme" :disabled="!writable || runner.busy.value || !!runner.pending.value" @click="repair()")
    template(#icon)
      span.crossed-hammers
        font-awesome-icon(icon="hammer")
        font-awesome-icon(icon="hammer")
    | Починить
  n-alert(v-if="runner.error.value" type="error") {{ runner.error.value }}
  n-button(:theme-overrides="worldActionButtonTheme" v-if="runner.pending.value && !runner.busy.value" @click="repair(true)") Повторить запрос
build-settings-modal(v-model:show="open" :project="project" :name="node.label" :owner="owner" :session="session" :creating="runner.busy.value" :creation-error="runner.error.value" repair navigate @saved="emit('changed')")
</template>
<style scoped>
.world-repair { margin: .75rem 0; }.crossed-hammers { position: relative; display: inline-block; width: 1.2rem; height: 1.2rem; }.crossed-hammers svg { position: absolute; inset: 0; transform: rotate(-25deg); }.crossed-hammers svg + svg { transform: scaleX(-1) rotate(-25deg); }
</style>

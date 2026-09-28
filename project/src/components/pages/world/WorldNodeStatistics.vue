<script setup lang="ts">
import { onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSpin } from 'naive-ui';
import { nodeLabels, nodeTypes, type NodeType, type WorldNode } from '@/entities/world/types';
import { loadWorldStatistics, worldError } from '@/services/api/world';

const props = defineProps<{ node: WorldNode; session: number }>();
const rows = shallowRef<{ type: NodeType; count: number }[]>([]);
const loading = ref(false), error = ref('');
let generation = 0;
async function load() {
  const current = ++generation;
  loading.value = true; error.value = '';
  try {
    const result = await loadWorldStatistics(props.node.id);
    if (current === generation) rows.value = result;
  } catch (cause) {
    if (current === generation) error.value = worldError(cause);
  } finally {
    if (current === generation) loading.value = false;
  }
}
watch([() => props.node.id, () => props.session], () => { rows.value = []; void load(); }, { immediate: true });
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
section.world-node-statistics(aria-label="Состав территории")
  .statistics-heading
    div
      span.eyebrow Состав территории
      h2 Объект и его потомки
    n-button(size="small" :loading="loading" @click="load") Обновить
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка статистики")
  .statistics-grid(v-else)
    .statistics-card(v-for="type in nodeTypes" :key="type")
      span {{ nodeLabels[type] }}
      strong {{ rows.find(row => row.type === type)?.count ?? 0 }}
  p.statistics-note В статистику входят доступные вам объекты этой ноды и её дочерних уровней.
</template>
<style scoped>
.world-node-statistics { display: grid; gap: 1rem; }
.statistics-heading { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.statistics-heading h2 { margin: .25rem 0 0; }
.statistics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: .75rem; }
.statistics-card { display: grid; gap: .4rem; padding: 1rem; border: 1px solid var(--border); border-radius: .6rem; background: var(--bg-surface); }
.statistics-card span, .statistics-note { color: var(--text-muted); }
.statistics-card strong { font-size: 1.5rem; color: var(--primary); }
</style>

<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import type { WorldNode } from '@/entities/world/types';
import { nodeIcons } from '@/entities/world/types';
import { loadWorldChildren } from '@/services/api/world';
const props = withDefaults(defineProps<{ node: WorldNode; session?: number; active?: boolean }>(), { session: 0, active: true });
const children = ref<WorldNode[]>([]), total = ref(0), error = ref(false);
let generation = 0;
async function refresh() {
  const current = ++generation;
  children.value = []; total.value = 0; error.value = false;
  if (!props.active || props.node.child_count === 0) return;
  try {
    const page = await loadWorldChildren(props.node.id, { 'per-page': 8, page: 1 });
    if (current !== generation) return;
    children.value = page.items; total.value = page.total;
  } catch {
    if (current === generation) error.value = true;
  }
}
watch([() => props.node.id, () => props.node.revision, () => props.node.child_count, () => props.session, () => props.active], refresh, { immediate: true, flush: 'sync' });
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
section.object-preview(v-if="children.length" aria-label="Дочерние объекты")
  .object-preview-grid
    router-link.object-preview-child(v-for="child in children" :key="child.id" :to="`/world/nodes/${child.id}`" :title="`${child.label} · №${child.id}`")
      font-awesome-icon(:icon="nodeIcons[child.type]" aria-hidden="true")
      span {{ child.label }}
  router-link.object-preview-more(v-if="total > children.length" :to="`/world/nodes/${node.id}#map`") Все объекты ({{ total }}) →
button.object-preview-retry(v-else-if="error" type="button" @click="refresh") Не удалось загрузить дочерние объекты. Повторить
</template>
<style scoped>
.object-preview { margin: .75rem 0; }
.object-preview-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .4rem; }
.object-preview-child { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .4rem; min-width: 0; min-height: 4.5rem; padding: .55rem .3rem; border: 1px solid var(--border); border-radius: .5rem; background: var(--bg-surface); text-align: center; text-decoration: none; }
.object-preview-child:hover, .object-preview-child:focus-visible { border-color: var(--primary); background: var(--primary-soft); }
.object-preview-child svg { color: var(--primary); font-size: 1.3rem; }
.object-preview-child span { color: var(--text); font-size: .75rem; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.object-preview-more { display: inline-block; margin-top: .5rem; font-size: .8rem; }
.object-preview-retry { padding: .5rem 0; border: 0; background: transparent; color: var(--text-muted); font: inherit; font-size: .8rem; cursor: pointer; text-align: left; }
</style>

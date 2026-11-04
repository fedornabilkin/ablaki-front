<script setup lang="ts">
import { NInput } from 'naive-ui';
import WorldActionBar from './WorldActionBar.vue';

export interface CatalogGroup { value: string; label: string; icon: string }
const props = defineProps<{ search: string; group: string; ready: boolean; groups: CatalogGroup[]; count: number; total: number }>();
const emit = defineEmits<{ 'update:search': [value: string]; 'update:group': [value: string]; 'update:ready': [value: boolean] }>();
function select(id: string) {
  if (id === '$ready') emit('update:ready', !props.ready);
  else emit('update:group', id);
}
</script>
<template lang="pug">
.world-catalog-filters
  .catalog-search
    n-input(:value="search" @update:value="emit('update:search', $event)" clearable placeholder="Поиск" aria-label="Поиск в каталоге")
      template(#prefix)
        font-awesome-icon(icon="search" aria-hidden="true")
    span.catalog-count(aria-label="Показано из общего количества") {{ count }} / {{ total }}
  world-action-bar(label="Фильтры каталога" :items="[...groups.map(item => ({ id: item.value, label: item.label, icon: item.icon, active: group === item.value, hint: item.value === 'all' ? 'Все группы каталога.' : `Группа: ${item.label}.` })), { id: '$ready', label: 'Доступно', icon: 'check', active: ready, hint: ready ? 'Показаны только доступные позиции.' : 'Нажмите, чтобы оставить только доступные позиции.' }]" @select="select")
</template>
<style scoped>
.world-catalog-filters { display: grid; gap: .5rem; min-width: 0; }
.catalog-search { display: flex; align-items: center; gap: .5rem; min-width: 0; }
.catalog-search > .n-input { min-width: 0; }
.catalog-count { flex: none; color: var(--text-muted); font-size: .75rem; font-variant-numeric: tabular-nums; }
.world-catalog-filters :deep(.world-action-label) { display: none; }
.world-catalog-filters :deep(.world-toolbar-action) { padding-inline: .55rem; }
</style>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue';
import { NButton, NFormItem, NInput, NInputNumber, NSelect } from 'naive-ui';
export interface FilterDefinition { key: string; label: string; type?: 'select' | 'number'; options?: { label: string; value: string | number }[]; min?: number; }
const props = withDefaults(defineProps<{ search: string; values?: Record<string, string>; filters?: FilterDefinition[]; loading?: boolean; placeholder?: string }>(), { values: () => ({}), filters: () => [], placeholder: 'Поиск на сервере' });
const emit = defineEmits<{ 'update:search': [value: string]; 'update:values': [values: Record<string, string>]; reset: [] }>();
const id = `list-filter-${getCurrentInstance()?.uid}`;
const hasFilters = computed(() => props.search !== '' || Object.values(props.values).some(value => value !== ''));
function change(key: string, value: string | number | null) { emit('update:values', { ...props.values, [key]: value == null ? '' : String(value) }); }
function numeric(key: string) { const value = props.values[key]; return value !== '' && Number.isFinite(Number(value)) ? Number(value) : null; }
</script>
<template lang="pug">
.list-filters(role="search" aria-label="Поиск и фильтры списка" :aria-busy="loading")
  n-form-item.search-field(label="Поиск" :label-props="{ for: id + '-search' }" :show-feedback="false")
    n-input(:value="search" @update:value="$emit('update:search', $event)" :input-props="{ id: id + '-search', type: 'search' }" :placeholder="placeholder" :maxlength="100" clearable)
  n-form-item(v-for="filter in filters" :key="filter.key" :label="filter.label" :label-props="{ for: id + '-' + filter.key }" :show-feedback="false")
    n-input-number(v-if="filter.type === 'number'" :value="numeric(filter.key)" @update:value="change(filter.key, $event)" :min="filter.min ?? 0" :input-props="{ id: id + '-' + filter.key }" clearable placeholder="Любой")
    n-select(v-else :value="values[filter.key] || null" @update:value="change(filter.key, $event)" :options="filter.options || []" :input-props="{ id: id + '-' + filter.key }" :aria-label="filter.label" clearable placeholder="Все")
  n-button.reset-filters(:disabled="!hasFilters" @click="$emit('reset')") Сбросить
</template>
<style scoped lang="scss">
.list-filters { display: grid; gap: .75rem; margin-bottom: 1rem; align-items: end; }
@media (min-width: 640px) { .list-filters { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); } .search-field { min-width: 220px; } }
</style>

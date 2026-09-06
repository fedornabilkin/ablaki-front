<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue';
import { NButton, NFormItem, NInput, NInputNumber, NSelect } from 'naive-ui';
export interface FilterDefinition { key: string; label: string; type?: 'select' | 'number'; options?: { label: string; value: string | number }[]; min?: number; }
const props = withDefaults(defineProps<{ search: string; values?: Record<string, string>; filters?: FilterDefinition[]; loading?: boolean; placeholder?: string }>(), { values: () => ({}), filters: () => [], placeholder: 'Поиск' });
const emit = defineEmits<{ 'update:search': [value: string]; 'update:values': [values: Record<string, string>]; reset: [] }>();
const id = `list-filter-${getCurrentInstance()?.uid}`;
const hasFilters = computed(() => props.search !== '' || Object.values(props.values).some(value => value !== ''));
function change(key: string, value: string | number | null) { emit('update:values', { ...props.values, [key]: value == null ? '' : String(value) }); }
function numeric(key: string) { const value = props.values[key]; return value !== '' && Number.isFinite(Number(value)) ? Number(value) : null; }
</script>
<template lang="pug">
.list-filters(role="search" aria-label="Поиск и фильтры списка" :aria-busy="loading")
  .filter-fields
    n-input.search-field(:value="search" @update:value="$emit('update:search', $event)" :input-props="{ id: id + '-search', type: 'search', 'aria-label': placeholder }" :placeholder="placeholder" :maxlength="100" clearable)
    n-form-item(v-for="filter in filters" :key="filter.key" :label="filter.label" :label-props="{ for: id + '-' + filter.key }" :show-feedback="false")
      n-input-number(v-if="filter.type === 'number'" :value="numeric(filter.key)" @update:value="change(filter.key, $event)" :min="filter.min ?? 0" :input-props="{ id: id + '-' + filter.key }" clearable placeholder="Любой")
      n-select(v-else :value="values[filter.key] || null" @update:value="change(filter.key, $event)" :options="filter.options || []" :input-props="{ id: id + '-' + filter.key }" :aria-label="filter.label" clearable placeholder="Все")
  n-button.reset-filters(quaternary circle :disabled="!hasFilters" title="Сбросить поиск и фильтры" aria-label="Сбросить поиск и фильтры" @click="$emit('reset')")
    template(#icon)
      font-awesome-icon(icon="fa fa-times" aria-hidden="true")
</template>
<style scoped lang="scss">
.list-filters { display: flex; gap: .5rem; margin-bottom: 1rem; align-items: end; }
.filter-fields { display: grid; flex: 1; min-width: 0; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); gap: .75rem; align-items: end; }
.search-field { min-width: 0; }
.reset-filters { flex: 0 0 auto; }
</style>

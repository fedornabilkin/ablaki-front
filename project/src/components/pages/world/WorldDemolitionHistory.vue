<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSpin } from 'naive-ui';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { loadDemolitions } from '@/services/api/worldDemolition';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; session: number }>();
const list = useListQuery({}, { prefix: 'demolitions' }), { page, search, filters } = list;
const params = computed(() => ({ page: page.value, q: list.params.value.q || '' }));
const state = shallowRef<Awaited<ReturnType<typeof loadDemolitions>> | null>(null), loading = ref(false), error = ref('');
let generation = 0, disposed = false;
async function load() {
  const current = ++generation; state.value = null; loading.value = true; error.value = '';
  try { const value = await loadDemolitions(props.nodeId, params.value); if (!disposed && current === generation) state.value = value; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session, params], load, { immediate: true, flush: 'sync' });
const date = (timestamp: number) => new Date(timestamp * 1000).toLocaleString('ru-RU');
onScopeDispose(() => { disposed = true; generation++; });
</script>
<template lang="pug">
section.world-demolition-history#demolitions
  h2 История сноса
  n-button(:loading="loading" @click="load") Обновить историю
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  list-filters(v-model:search="search" v-model:values="filters" :filters="[]" :loading="loading" placeholder="Найти снесённую постройку" @reset="list.reset")
  n-spin(v-if="loading" aria-label="Загрузка истории сноса")
  template(v-else-if="state")
    p(v-if="!state.items.length") Снесённых построек по выбранным условиям нет.
    article(v-for="item in state.items" :key="item.id")
      h3 {{ item.name }}
      p {{ date(item.created_at) }} · Освобождена площадь: {{ item.area }}. Снос без возврата Cr и материалов.
    page-pager(v-model:page="page" query-prefix="demolitions" :result="state")
</template>
<style scoped>
.world-demolition-history { display: grid; gap: .75rem; }
</style>

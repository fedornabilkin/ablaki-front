<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { Page } from '@/services/api/portal';
const props = withDefaults(defineProps<{ page: number; result: Page; disabled?: boolean; queryPrefix?: string }>(), { queryPrefix: '' });
const route = useRoute();
const emit = defineEmits<{ 'update:page': [page: number] }>();
const pages = computed(() => props.result.total === null ? null : Math.max(1, Math.ceil(props.result.total / props.result.pageSize)));
const next = computed(() => props.result.items.length >= props.result.pageSize);
function target(page: number) {
  const query = { ...route.query };
  const key = props.queryPrefix ? props.queryPrefix + '_page' : 'page';
  if (page === 1) delete query[key];
  else query[key] = String(page);
  return { path: route.path, query, hash: route.hash };
}
watch(() => [props.result.currentPage, props.disabled, props.result.total] as const, () => {
  if (props.disabled || props.result.total === null) return;
  const target = props.result.currentPage ?? Math.min(props.page, pages.value!);
  if (target !== props.page) emit('update:page', target);
}, { immediate: true });
</script>
<template lang="pug">
nav.pager(aria-label="Страницы списка")
  .muted(v-if="pages !== null") Всего: {{ result.total }} · Страница {{ page }} из {{ pages }}
  .page-links(v-if="pages !== null ? pages > 1 : page > 1 || next")
    router-link.nav-item(v-if="!disabled && page > 1" :to="target(page - 1)" rel="prev") ← Назад
    span.nav-item.muted(v-else aria-disabled="true") ← Назад
    span Страница {{ page }}
    router-link.nav-item(v-if="!disabled && (pages !== null ? page < pages : next)" :to="target(page + 1)" rel="next") Далее →
    span.nav-item.muted(v-else aria-disabled="true") Далее →
</template>
<style scoped>.pager { flex-direction: column; gap: .75rem; } .page-links { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .25rem; } [aria-disabled="true"] { opacity: .5; }</style>

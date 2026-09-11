<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { Page } from '@/services/api/portal';
const props = withDefaults(defineProps<{ page: number; result: Page; disabled?: boolean; queryPrefix?: string }>(), { queryPrefix: '' });
const route = useRoute();
const emit = defineEmits<{ 'update:page': [page: number] }>();
const pages = computed(() => props.result.total === null ? null : Math.max(1, Math.ceil(props.result.total / props.result.pageSize)));
const next = computed(() => props.result.items.length >= props.result.pageSize);
const pageItems = computed<(number | 'ellipsis')[]>(() => {
  const total = pages.value;
  const current = props.page;
  if (total === null || total <= 7) return total === null ? [] : Array.from({ length: total }, (_, index) => index + 1);
  const values: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) values.push('ellipsis');
  for (let value = start; value <= end; value++) values.push(value);
  if (end < total - 1) values.push('ellipsis');
  values.push(total);
  return values;
});
function target(page: number) {
  const query = { ...route.query };
  const key = props.queryPrefix ? props.queryPrefix + '_page' : 'page';
  if (page === 1) delete query[key];
  else query[key] = String(page);
  return { path: route.path, query, hash: route.hash };
}
watch(() => [props.result.currentPage, props.disabled, props.result.total] as const, () => {
  if (props.disabled || props.result.total === null) return;
  const targetPage = props.result.currentPage ?? Math.min(props.page, pages.value!);
  if (targetPage !== props.page) emit('update:page', targetPage);
}, { immediate: true });
</script>
<template lang="pug">
nav.pager(aria-label="Страницы списка")
  .muted(v-if="pages !== null") Всего: {{ result.total }} · Страница {{ page }} из {{ pages }}
  .page-links(v-if="pages !== null ? pages > 1 : page > 1 || next")
    router-link.page-link(v-if="!disabled && page > 1" :to="target(page - 1)" rel="prev" aria-label="Предыдущая страница")
      font-awesome-icon(icon="arrow-left" aria-hidden="true")
    span.page-link.muted(v-else aria-disabled="true" aria-label="Предыдущая страница")
      font-awesome-icon(icon="arrow-left" aria-hidden="true")
    template(v-for="(item, index) in pageItems" :key="`${item}-${index}`")
      span.page-ellipsis(v-if="item === 'ellipsis'" aria-hidden="true") …
      router-link.page-link(v-else :to="target(item)" :class="{ active: item === page }" :aria-current="item === page ? 'page' : undefined") {{ item }}
    router-link.page-link(v-if="!disabled && (pages !== null ? page < pages : next)" :to="target(page + 1)" rel="next" aria-label="Следующая страница")
      font-awesome-icon(icon="arrow-right" aria-hidden="true")
    span.page-link.muted(v-else aria-disabled="true" aria-label="Следующая страница")
      font-awesome-icon(icon="arrow-right" aria-hidden="true")
</template>
<style scoped>
.pager { flex-direction: column; gap: .75rem; }
.page-links { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .25rem; }
.page-link { display: inline-flex; align-items: center; justify-content: center; min-width: 2.25rem; height: 2.25rem; padding: 0 .55rem; border: 1px solid var(--border); border-radius: .35rem; text-decoration: none; }
.page-link.active { color: #fff; background: var(--primary); border-color: var(--primary); font-weight: 700; }
.page-ellipsis { min-width: 1.5rem; text-align: center; color: var(--text-muted); }
[aria-disabled="true"] { opacity: .5; }
</style>

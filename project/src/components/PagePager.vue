<script setup lang="ts">
import { computed, watch } from 'vue';
import { NButton, NPagination } from 'naive-ui';
import type { Page } from '@/services/api/portal';
const props = defineProps<{ page: number; result: Page; disabled?: boolean }>();
const emit = defineEmits<{ 'update:page': [page: number] }>();
const pages = computed(() => props.result.total === null ? null : Math.max(1, Math.ceil(props.result.total / props.result.pageSize)));
const next = computed(() => props.result.items.length >= props.result.pageSize);
watch(() => [props.result.currentPage, props.disabled, props.result.total] as const, () => {
  if (props.disabled || props.result.total === null) return;
  const target = props.result.currentPage ?? Math.min(props.page, pages.value!);
  if (target !== props.page) emit('update:page', target);
}, { immediate: true });
</script>
<template lang="pug">
nav.pager(aria-label="Страницы списка")
  template(v-if="pages !== null")
    .muted Всего: {{ result.total }} · Страница {{ page }} из {{ pages }}
    n-pagination(:page="page" @update:page="$emit('update:page', $event)" :page-count="pages" :page-slot="5" :disabled="disabled")
  template(v-else-if="page > 1 || next")
    n-button(:disabled="disabled || page <= 1" @click="$emit('update:page', page - 1)") Назад
    span Страница {{ page }}
    n-button(:disabled="disabled || !next" @click="$emit('update:page', page + 1)") Далее
</template>
<style scoped>.pager { flex-direction: column; gap: .75rem; }</style>

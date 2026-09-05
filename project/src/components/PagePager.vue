<script setup lang="ts">
import { computed } from 'vue';
import { NButton } from 'naive-ui';
import type { Page } from '@/services/api/portal';
const props = defineProps<{ page: number; result: Page; disabled?: boolean }>();
defineEmits<{ 'update:page': [page: number] }>();
const next = computed(() => props.result.total === null ? props.result.items.length >= props.result.pageSize : props.page * props.result.pageSize < props.result.total);
</script>
<template lang="pug">
nav.pager(v-if="page > 1 || next" aria-label="Страницы")
  n-button(:disabled="disabled || page <= 1" @click="$emit('update:page', page - 1)") Назад
  span Страница {{ page }}
  n-button(:disabled="disabled || !next" @click="$emit('update:page', page + 1)") Далее
</template>

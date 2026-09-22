<script setup lang="ts">
import { NAlert, NButton, NEmpty, NSkeleton } from 'naive-ui';
import { ref, watch } from 'vue';
const props = defineProps<{ loading: boolean; error: string; empty?: boolean }>();
defineEmits<{ retry: [] }>();
const region = ref<HTMLElement>();
const retainedHeight = ref(0);
watch(() => props.loading, loading => {
  if (loading && region.value) retainedHeight.value = region.value.getBoundingClientRect().height;
}, {flush: 'sync'});
</script>

<template lang="pug">
.request-region(ref="region" :aria-busy="loading" :style="{minHeight: loading && retainedHeight ? retainedHeight + 'px' : undefined}")
  .stack(v-if="loading" role="status" aria-label="Загрузка")
    n-skeleton(text :repeat="3")
  n-alert(v-else-if="error" type="error" title="Не удалось загрузить данные" role="alert")
    p {{ error }}
    n-button(@click="$emit('retry')") Повторить
  n-empty(v-else-if="empty" description="Пока нет записей")
  slot(v-else)
</template>
<style scoped>.request-region { min-width: 0; }</style>

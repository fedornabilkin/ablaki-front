<script setup lang="ts">
import { NAlert, NButton, NEmpty, NSkeleton } from 'naive-ui';
defineProps<{ loading: boolean; error: string; empty?: boolean }>();
defineEmits<{ retry: [] }>();
</script>

<template lang="pug">
.stack(v-if="loading" role="status" aria-label="Загрузка")
  n-skeleton(text :repeat="3")
n-alert(v-else-if="error" type="error" title="Не удалось загрузить данные" role="alert")
  p {{ error }}
  n-button(@click="$emit('retry')") Повторить
n-empty(v-else-if="empty" description="Пока нет записей")
slot(v-else)
</template>

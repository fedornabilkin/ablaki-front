<script setup lang="ts">
import {NAlert, NButton} from 'naive-ui';
defineProps<{failed: boolean}>();
defineEmits<{retry: []}>();
</script>

<template lang="pug">
n-alert(v-if="failed" type="error" title="Не удалось загрузить данные")
  p Проверьте соединение и повторите попытку.
  n-button(size="small" @click="$emit('retry')") Повторить
</template>

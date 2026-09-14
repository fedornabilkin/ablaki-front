<script setup lang="ts">
import {NAlert, NButton} from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import {shopUnavailableMessage} from '@/services/api/craft';
</script>

<template lang="pug">
page-header(page-title="Магазин материалов")
.container.page
  n-alert(type="info" title="Магазин аккаунта пока недоступен" role="status")
    p {{ shopUnavailableMessage }}
    router-link(:to="{path: '/craft', query: {mode: 'workshop'}}")
      n-button(tag="span" type="primary") Открыть локальную мастерскую
</template>

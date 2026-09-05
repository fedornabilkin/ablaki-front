<script setup lang="ts">
import { ref } from 'vue';
import { NButton } from 'naive-ui';
import NewOrder from './NewOrder.vue';
import PageHeader from '@/components/PageHeader.vue';
const newOrderDialog = ref(false);
const version = ref(0);
const links = [{ link: '/exchange', title: 'Все заявки' }, { link: '/exchange/my', title: 'Мои заявки' }, { link: '/exchange/history', title: 'История' }];
function created() { newOrderDialog.value = false; version.value++; }
</script>
<template lang="pug">
page-header(page-title="Биржа кредитов" :extra-links="links")
  template(#actions)
    n-button(type="primary" @click="newOrderDialog = true") Добавить заявку
new-order(:is-open="newOrderDialog" @created="created" @close="newOrderDialog = false")
.container.page
  router-view(v-slot="{ Component }")
    component(:is="Component" :key="version")
</template>

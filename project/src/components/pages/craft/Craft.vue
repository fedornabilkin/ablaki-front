<script setup lang="ts">
import {ref} from 'vue';
import {useRoute} from 'vue-router';
import {NAlert, NButton} from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import Workshop from './Workshop.vue';
import {craftUnavailableMessage} from '@/services/api/craft';

const route = useRoute();
const localWorkshop = ref(route.query.mode === 'workshop');
</script>

<template lang="pug">
page-header(page-title="Крафт")
  template(#actions)
    n-button(@click="localWorkshop = !localWorkshop" :aria-expanded="localWorkshop") {{ localWorkshop ? 'Крафт аккаунта' : 'Открыть локальную мастерскую' }}
workshop(v-if="localWorkshop")
.container.page(v-else)
  n-alert(type="info" title="Крафт аккаунта пока недоступен" :show-icon="true" role="status")
    p {{ craftUnavailableMessage }}
    n-button(type="primary" @click="localWorkshop = true") Попробовать в мастерской
</template>

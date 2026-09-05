<script setup lang="ts">
import { ref, computed } from 'vue';
import { NCard, NInput } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import RequestState from '@/components/RequestState.vue';
import { list, emptyPage, field, date, person } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
const { data, loading, error, refresh } = usePageRequest(() => list('users/last'), emptyPage());
const search = ref('');
const members = computed(() => data.value.items.filter(user => field(user.username).toLowerCase().includes(search.value.toLowerCase().trim())));
</script>
<template lang="pug">
page-header(page-title="Участники")
.container.page.stack
  p.muted Последние 20 зарегистрированных участников сообщества.
  n-input(v-model:value="search" placeholder="Найти среди новых участников" aria-label="Поиск участников" clearable)
  request-state(:loading="loading" :error="error" :empty="!members.length" @retry="refresh")
    .cards
      n-card(v-for="user in members" :key="user.id")
        router-link.record-title(:to="'/wall/' + encodeURIComponent(field(user.username))") {{ field(user.username) }}
        p.muted.mt-3 В сообществе с {{ date(user.created_at) }}
        p Рейтинг: {{ field(person(user).rating) }}
</template>

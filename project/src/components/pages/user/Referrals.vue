<script setup lang="ts">
import { NCard } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import RequestState from '@/components/RequestState.vue';
import PagePager from '@/components/PagePager.vue';
import ListFilters from '@/components/ListFilters.vue';
import { list, emptyPage, field, date, person } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
import { useListQuery } from '@/hooks/useListQuery';
const { page, search, filters, params, reset } = useListQuery();
const { data, loading, error, refresh } = usePageRequest(() => list('users/referrals', page.value, params.value), emptyPage(), [page, params]);
</script>
<template lang="pug">
page-header(page-title="Мои рефералы" :extra-links="[{ link: '/users/profile', title: 'Мой профиль' }]")
.container.page.stack
  p.muted Участники, которые зарегистрировались по вашему приглашению.
  list-filters(v-model:search="search" v-model:values="filters" :loading="loading" @reset="reset")
  request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
    n-card
      .record-row(v-for="user in data.items" :key="user.id")
        div
          router-link.record-title(:to="'/wall/' + encodeURIComponent(field(user.username))") {{ field(user.username) }}
          .muted Регистрация: {{ date(user.created_at) }}
        span Рейтинг: {{ field(person(user).rating) }}
  page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading")
</template>

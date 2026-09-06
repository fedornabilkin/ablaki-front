<script setup lang="ts">
import { NCard } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import RequestState from '@/components/RequestState.vue';
import PagePager from '@/components/PagePager.vue';
import ListFilters from '@/components/ListFilters.vue';
import { list, emptyPage } from '@/services/api/portal';
import UserList from '@/components/user/UserList.vue';
import { usePageRequest } from '@/hooks/usePageRequest';
import { useListQuery } from '@/hooks/useListQuery';
const { page, search, filters, params, reset } = useListQuery();
const { data, loading, error, refresh } = usePageRequest(() => list('users/referrals', page.value, params.value), emptyPage(), [page, params]);
</script>
<template lang="pug">
page-header(page-title="Мои рефералы" :extra-links="[{ link: '/users/profile', title: 'Мой профиль' }]")
.container.page.stack
  p.muted Участники, которые зарегистрировались по вашему приглашению.
  n-card
    list-filters(v-model:search="search" v-model:values="filters" :loading="loading" @reset="reset")
    request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
      user-list(:users="data.items")
    page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading")
</template>

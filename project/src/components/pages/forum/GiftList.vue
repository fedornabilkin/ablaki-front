<script setup lang="ts">
import { computed } from 'vue';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import RequestState from '@/components/RequestState.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { usePageRequest } from '@/hooks/usePageRequest';
import { list, emptyPage, field, date } from '@/services/api/portal';
const props = defineProps<{ commentId: number }>();
const id = computed(() => props.commentId);
const { page, search, filters, params, reset } = useListQuery({}, { prefix: 'gifts' });
const { data, loading, error, refresh } = usePageRequest(() => list(`forum-comment/${id.value}/gifts`, page.value, params.value), emptyPage(), [id, page, params]);
</script>
<template lang="pug">
.stack
  p.muted Каждый участник передал автору сообщения 1 Cr.
  list-filters(v-model:search="search" v-model:values="filters" :loading="loading" @reset="reset")
  request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
    .record-row(v-for="gift in data.items" :key="gift.id")
      router-link(:to="'/wall/' + encodeURIComponent(field(gift.username))") {{ field(gift.username) }}
      time.muted {{ date(gift.created_at) }}
  page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading")
</template>

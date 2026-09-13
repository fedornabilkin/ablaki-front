<script setup lang="ts">
import { computed } from 'vue';
import { NCard } from 'naive-ui';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import RequestState from '@/components/RequestState.vue';
import GameHistoryList from './GameHistoryList.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { usePageRequest } from '@/hooks/usePageRequest';
import { list, emptyPage } from '@/services/api/portal';
import type { GameKind } from '@/services/api/gameOverview';
const props = defineProps<{ kind: GameKind; version: number }>();
const kind = computed(() => props.kind);
const version = computed(() => props.version);
const { page, search, filters, params, reset } = useListQuery({ kon: '' }, { prefix: 'recent', defaultSort: props.kind === 'saper' ? '-time_over_at,-id' : '-updated_at,-id' });
const filterDefinitions = [{ key: 'kon', label: 'Ставка', type: 'number' as const }];
const { data, loading, error, refresh } = usePageRequest(() => list(kind.value + '/recent', page.value, { ...params.value, 'per-page': 5 }), emptyPage(), [kind, version, page, params]);
</script>
<template lang="pug">
n-card(title="Последние завершённые игры")
  .stack
    list-filters(v-model:search="search" v-model:values="filters" :filters="filterDefinitions" :loading="loading" @reset="reset")
    request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
      game-history-list(:games="data.items" :kind="kind")
    page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading" query-prefix="recent")
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { NCard } from 'naive-ui';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import RequestState from '@/components/RequestState.vue';
import GameHistoryList from './GameHistoryList.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { usePageRequest } from '@/hooks/usePageRequest';
import { list, emptyPage } from '@/services/api/portal';
import type { HistoryGameKind } from '@/services/api/gameHistory';

const props = defineProps<{ kind: HistoryGameKind; reloadListTrigger?: boolean }>();
const store = useStore();
const kind = computed(() => props.kind);
const reload = computed(() => props.reloadListTrigger);
const session = computed(() => store.state.auth.revision);
const { page, search, filters, params, reset } = useListQuery({ kon: '' }, {
  defaultSort: props.kind === 'saper' ? '-time_over_at,-id' : '-updated_at,-id',
});
const definitions = [{ key: 'kon', label: 'Ставка', type: 'number' as const }];
const history = usePageRequest(() => list(`${kind.value}/history`, page.value, params.value), emptyPage(), [kind, page, params, reload, session]);
</script>
<template lang="pug">
n-card
  .stack
    list-filters(v-model:search="search" v-model:values="filters" :filters="definitions" :loading="history.loading.value" placeholder="Игрок или номер игры" @reset="reset")
    request-state(:loading="history.loading.value" :error="history.error.value" :empty="!history.data.value.items.length" @retry="history.refresh")
      game-history-list(:games="history.data.value.items" :kind="kind")
    page-pager(v-if="!history.error.value" v-model:page="page" :result="history.data.value" :disabled="history.loading.value")
</template>

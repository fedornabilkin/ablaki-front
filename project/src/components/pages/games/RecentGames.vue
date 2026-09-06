<script setup lang="ts">
import { computed } from 'vue';
import { NCard } from 'naive-ui';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import RequestState from '@/components/RequestState.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { usePageRequest } from '@/hooks/usePageRequest';
import { list, emptyPage, field, date } from '@/services/api/portal';
import { winnerName, type GameKind } from '@/services/api/gameOverview';
const props = defineProps<{ kind: GameKind; version: number }>();
const kind = computed(() => props.kind);
const version = computed(() => props.version);
const unit = computed(() => kind.value === 'saper' ? 'Кг' : 'Cr');
const { page, search, filters, params, reset } = useListQuery({ kon: '' }, { prefix: 'recent', defaultSort: props.kind === 'saper' ? '-time_over_at,-id' : '-updated_at,-id' });
const filterDefinitions = [{ key: 'kon', label: 'Кон', type: 'number' as const }];
const { data, loading, error, refresh } = usePageRequest(() => list(kind.value + '/recent', page.value, { ...params.value, 'per-page': 5 }), emptyPage(), [kind, version, page, params]);
</script>
<template lang="pug">
n-card(title="Последние завершённые игры")
  .stack
    list-filters(v-model:search="search" v-model:values="filters" :filters="filterDefinitions" :loading="loading" @reset="reset")
    request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
      .record-row(v-for="game in data.items" :key="game.id")
        .stack.players
          .toolbar
            router-link(v-if="typeof game.username === 'string' && game.username" :to="'/wall/' + encodeURIComponent(game.username)") {{ game.username }}
            span.muted(v-else) Участник недоступен
            font-awesome-icon.winner(v-if="winnerName(game) === game.username" icon="crown" title="Победитель" aria-label="Победитель")
            span.muted против
            router-link(v-if="typeof game.username_gamer === 'string' && game.username_gamer" :to="'/wall/' + encodeURIComponent(game.username_gamer)") {{ game.username_gamer }}
            span.muted(v-else) Участник недоступен
            font-awesome-icon.winner(v-if="winnerName(game) === game.username_gamer" icon="crown" title="Победитель" aria-label="Победитель")
          small.muted №{{ game.id }} · {{ date(game.completed_at ?? game.updated_at ?? game.time_over_at) }}
        strong Кон: {{ field(game.kon) }} {{ unit }}
    page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading" query-prefix="recent")
</template>
<style scoped lang="scss">
.players { gap: .25rem; }
.winner { color: var(--primary); }
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { NButton, NCard } from 'naive-ui';
import PagePager from '@/components/PagePager.vue';
import RequestState from '@/components/RequestState.vue';
import GameHistoryList from './GameHistoryList.vue';
import { useGameHistory } from '@/hooks/useGameHistory';
import { formatAccountNumber } from '@/services/api/header';
import { historyPeriods, type HistoryGameKind, type HistoryScope } from '@/services/api/gameHistory';

const props = withDefaults(defineProps<{ kind: HistoryGameKind; reloadListTrigger?: boolean | number; scope?: HistoryScope }>(), { scope: 'history' });
const store = useStore();
const kind = computed(() => props.kind);
const session = computed(() => store.state.auth.revision);
const { page, period, kon, kons, history, selectPeriod, selectKon, prefix } = useGameHistory(kind, props.scope, computed(() => props.reloadListTrigger), session);
</script>
<template lang="pug">
n-card(:title="scope === 'recent' ? 'Последние завершённые игры' : undefined")
  .stack
    .history-buttons(v-if="scope !== 'recent'" role="group" aria-label="Период истории")
      n-button(v-for="item in historyPeriods" :key="item.value" :type="period === item.value ? 'primary' : 'default'" :aria-pressed="period === item.value" @click="selectPeriod(item.value)") {{ item.label }}
    .history-buttons.stake-buttons(v-if="scope !== 'recent'" role="group" aria-label="Ставка")
      n-button(:type="!kon ? 'primary' : 'default'" :aria-pressed="!kon" @click="selectKon('')") Все ставки
      span.muted(v-if="kons.loading.value" role="status") Загрузка ставок…
      template(v-else-if="kons.error.value")
        span(role="alert") {{ kons.error.value }}
        n-button(@click="kons.refresh") Повторить
      template(v-else)
        n-button(v-for="item in kons.data.value" :key="item.kon" :type="Number(kon) === Number(item.kon) ? 'primary' : 'default'" :aria-pressed="Number(kon) === Number(item.kon)" @click="selectKon(item.kon)") {{ formatAccountNumber(item.kon) }} {{ kind === 'saper' ? 'Кг' : 'Cr' }} ({{ item.count }})
        span.muted(v-if="!kons.data.value.length") За этот период игр нет
    request-state(:loading="history.loading.value" :error="history.error.value" :empty="!history.data.value.items.length" @retry="history.refresh")
      game-history-list(:games="history.data.value.items" :kind="kind")
    page-pager(v-if="scope !== 'recent' && !history.error.value" v-model:page="page" :result="history.data.value" :disabled="history.loading.value" :query-prefix="prefix")
</template>
<style scoped>
.history-buttons { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.stake-buttons { flex-wrap: nowrap; overflow-x: auto; padding-bottom: .3rem; }.stake-buttons > * { flex-shrink: 0; }
</style>

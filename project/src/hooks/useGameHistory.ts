import { computed, type Ref } from 'vue';
import { useListQuery } from './useListQuery';
import { usePageRequest } from './usePageRequest';
import { emptyPage, list } from '@/services/api/portal';
import { historyKons, historyPeriod, type HistoryKon, type HistoryGameKind, type HistoryScope, type HistoryPeriod } from '@/services/api/gameHistory';

export function useGameHistory(kind: Ref<HistoryGameKind>, scope: HistoryScope, version: Ref<unknown>, session: Ref<unknown>) {
  const prefix = scope === 'recent' ? 'recent' : '';
  const { page, filters } = useListQuery({ period: 'all', kon: '' }, { prefix });
  const period = computed(() => scope === 'recent' ? 'all' : historyPeriod(filters.value.period));
  const kon = computed(() => scope === 'recent' ? '' : filters.value.kon);
  const kons = usePageRequest<HistoryKon[]>(() => scope === 'recent' ? Promise.resolve([]) : historyKons(kind.value, period.value, scope), [], [kind, period, version, session]);
  const params = computed(() => ({
    period: period.value,
    ...(kon.value ? { 'filter[kon]': kon.value } : {}),
    sort: kind.value === 'saper' ? '-time_over_at,-id' : '-updated_at,-id',
    'per-page': scope === 'recent' ? 5 : 20,
  }));
  const currentPage = computed(() => scope === 'recent' ? 1 : page.value);
  const history = usePageRequest(() => list(`${kind.value}/${scope}`, currentPage.value, params.value), emptyPage(), [kind, currentPage, params, version, session]);
  function selectPeriod(value: HistoryPeriod) { if (scope !== 'recent') filters.value = { period: value, kon: '' }; }
  function selectKon(value: string) { if (scope !== 'recent') filters.value = { period: period.value, kon: value }; }
  return { page, period, kon, kons, history, selectPeriod, selectKon, prefix };
}

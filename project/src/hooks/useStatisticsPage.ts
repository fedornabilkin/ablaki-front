import { useListQuery } from '@/hooks/useListQuery';
import { usePageRequest } from '@/hooks/usePageRequest';
import { list, emptyPage } from '@/services/api/portal';
import { getStatistics, type Statistics } from '@/services/api/statistics';

export const rankingPeriods = [
  { label: 'Всё время', value: 'all' },
  { label: 'Сутки', value: 'day' },
  { label: 'Неделя', value: 'week' },
  { label: 'Месяц', value: 'month' },
  { label: 'Полгода', value: 'half-year' },
] as const;

export function useStatisticsPage() {
  const summary = usePageRequest(getStatistics, null as Statistics | null);
  const query = useListQuery({ period: 'all' }, { defaultSort: '-rating' });
  const { page, params, filters } = query;
  const ranking = usePageRequest(() => list('stat/top', page.value, {
    ...params.value, period: filters.value.period, 'filter[period]': undefined,
  }), emptyPage(), [page, params]);

  function choosePeriod(period: string) {
    if (rankingPeriods.some(item => item.value === period) && filters.value.period !== period) {
      // Invoke the URL-backed computed setter; mutating its returned object loses the update.
      filters.value = { ...filters.value, period };
    }
  }
  return { ...query, summary, ranking, choosePeriod };
}

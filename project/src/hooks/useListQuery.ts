import { computed, onScopeDispose, ref, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';

export function queryText(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 100) : '';
}
export function queryPage(value: unknown): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 && page <= 1000000 ? page : 1;
}

/** URL is the applied state; only the search input keeps a short-lived draft. */
export function useListQuery(defaultFilters: Record<string, string> = {}, options: { prefix?: string; defaultSort?: string } = {}) {
  const route = useRoute();
  const router = useRouter();
  const prefix = options.prefix ? `${options.prefix}_` : '';
  const key = (name: string) => prefix + name;
  const defaultSort = options.defaultSort || '-id';
  const appliedSearch = computed(() => queryText(route.query[key('q')]));
  const search = ref(appliedSearch.value);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let pending: LocationQueryRaw | null = null;
  let pendingPath = '';
  let revision = 0;

  function clearTimer() { if (timer !== undefined) clearTimeout(timer); timer = undefined; }
  function update(changes: Record<string, string | number | undefined>) {
    if (disposed) return;
    // Merge updates made by multiple controls in the same event before navigating.
    if (!pending || pendingPath !== route.path) { pending = { ...route.query }; pendingPath = route.path; }
    for (const [name, value] of Object.entries(changes)) {
      if (value === undefined || value === '') delete pending[key(name)];
      else pending[key(name)] = String(value);
    }
    const current = ++revision;
    queueMicrotask(() => {
      if (disposed || current !== revision || pendingPath !== route.path || !pending) return;
      const query = pending;
      pending = null;
      void router.push({ path: route.path, query, hash: route.hash }).catch(() => { /* Navigation cancellation preserves the current URL. */ });
    });
  }

  const page = computed({
    get: () => queryPage(route.query[key('page')]),
    set: (value: number) => update({ page: value > 1 && Number.isSafeInteger(value) ? value : undefined }),
  });
  const filterSignature = computed(() => JSON.stringify(Object.fromEntries(Object.entries(defaultFilters).map(([name, fallback]) => [name, queryText(route.query[key(name)]) || fallback]))));
  const filters = computed<Record<string, string>>({
    get: () => JSON.parse(filterSignature.value),
    set: values => update({ ...Object.fromEntries(Object.keys(defaultFilters).map(name => [name, queryText(values[name]) === defaultFilters[name] ? undefined : queryText(values[name])])), page: undefined }),
  });
  const sort = computed({
    get: () => queryText(route.query[key('sort')]) || defaultSort,
    set: (value: string) => update({ sort: value === defaultSort ? undefined : queryText(value), page: undefined }),
  });
  const params = computed<Record<string, unknown>>(() => ({
    ...(appliedSearch.value ? { q: appliedSearch.value } : {}),
    sort: sort.value,
    ...Object.fromEntries(Object.entries(filters.value).filter(([, value]) => value !== '').map(([name, value]) => [`filter[${name}]`, value])),
  }));

  watch(search, value => {
    clearTimer();
    if (queryText(value) === appliedSearch.value) return;
    const path = route.path;
    timer = setTimeout(() => { if (path === route.path) update({ q: queryText(value), page: undefined }); }, 350);
  });
  watch(() => JSON.stringify(['q', 'page', 'sort', ...Object.keys(defaultFilters)].map(name => route.query[key(name)])), () => {
    clearTimer(); search.value = appliedSearch.value;
  });
  watch(() => route.path, () => { clearTimer(); pending = null; revision++; search.value = appliedSearch.value; });
  function reset() {
    clearTimer();
    search.value = '';
    update({ q: undefined, page: undefined, sort: undefined, ...Object.fromEntries(Object.keys(defaultFilters).map(name => [name, undefined])) });
  }
  onScopeDispose(() => { disposed = true; clearTimer(); pending = null; revision++; });
  return { page, search, filters, params, sort, reset };
}

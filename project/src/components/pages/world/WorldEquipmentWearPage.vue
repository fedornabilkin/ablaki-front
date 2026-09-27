<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NSpin } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { loadEquipmentWear, wearKinds, wearLabels } from '@/services/api/worldEquipmentWear';
import { worldError } from '@/services/api/world';
const route = useRoute(), auth = useStore();
const instance = computed(() => Number(route.params.id)), session = computed(() => Number(auth.state.auth.revision));
const valid = computed(() => Number.isSafeInteger(instance.value) && instance.value > 0 && instance.value <= 2147483647);
const list = useListQuery({ kind: '' }, { prefix: 'wear' }), { page, search, filters } = list;
const params = computed(() => ({ page: page.value, q: list.params.value.q || '', kind: filters.value.kind }));
const filterDefinitions = [{ key: 'kind', label: 'Причина', options: [{ value: '', label: 'Все причины' }, ...wearKinds.map(value => ({ value, label: wearLabels[value] }))] }];
const state = shallowRef<Awaited<ReturnType<typeof loadEquipmentWear>> | null>(null), loading = ref(false), error = ref('');
const places = { outdoor: 'На улице', covered: 'Под навесом', indoor: 'В помещении', carried: 'В инвентаре' };
const date = (value: number) => new Date(value * 1000).toLocaleString('ru-RU');
let generation = 0, disposed = false;
async function load() {
  const current = ++generation; state.value = null; error.value = ''; loading.value = false;
  if (!valid.value) return;
  loading.value = true;
  try { const result = await loadEquipmentWear(instance.value, params.value); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([instance, session, params], load, { immediate: true, flush: 'sync' });
onScopeDispose(() => { disposed = true; generation++; });
</script>
<template lang="pug">
page-header(pageTitle="История прочности")
.container.equipment-history
  router-link(to="/world") Вернуться в мир
  n-alert(v-if="!valid" type="error") Некорректный адрес экземпляра.
  template(v-else)
    n-button(:loading="loading" @click="load") Обновить историю
    n-alert(v-if="error" type="error" role="alert") {{ error }}
    list-filters(v-model:search="search" v-model:values="filters" :filters="filterDefinitions" :loading="loading" placeholder="Найти причину изменения" @reset="list.reset")
    n-spin(v-if="loading" aria-label="Загрузка истории прочности")
    template(v-else-if="state")
      h2 {{ state.name }} · экземпляр №{{ instance }}
      p Прочность: {{ state.durability }} / {{ state.maximum }}. {{ places[state.exposure] }}. Износ от времени: {{ state.dailyWear }} в сутки.
      p Состояние на {{ date(state.serverTime) }}. История содержит сохранённые изменения; текущая прочность также учитывает время после последней записи.
      n-alert(v-if="state.durability === 0" type="warning") Предмет изношен. Он остаётся в хранилище, но не может выполнять работу или защищать ночлег.
      router-link(v-if="state.shelter" :to="`/world/nodes/${state.returnNode}#shelter`") Открыть шалаш и ремонт
      router-link(v-else :to="{ path: `/world/storage/${state.storageId}`, query: state.returnNode ? { node_id: state.returnNode } : {} }") Открыть текущее хранилище
      p История ведётся с подключения журнала. Прежние события не восстанавливаются задним числом.
      p(v-if="!state.items.length") По выбранным условиям записей нет.
      ol.history
        li(v-for="entry in state.items" :key="entry.id")
          strong {{ wearLabels[entry.kind] }} · {{ entry.before }} → {{ entry.after }}
          p {{ date(entry.started) }}{{ entry.ended === entry.started ? '' : ` — ${date(entry.ended)}` }}
          p(v-if="entry.kind === 'location'") {{ places[entry.classBefore] }} → {{ places[entry.classAfter] }}. Износ: {{ entry.rateBefore }} → {{ entry.rateAfter }} в сутки.
          p(v-else-if="entry.kind === 'elapsed'") {{ places[entry.classBefore] }} · {{ entry.rateBefore }} в сутки. Неполная единица износа сохраняется для следующего расчёта.
      page-pager(v-model:page="page" query-prefix="wear" :result="state" :disabled="loading")
</template>
<style scoped>
.equipment-history { display: grid; gap: .75rem; }
.history { list-style: none; padding: 0; display: grid; gap: .75rem; }
.history li { border: 1px solid var(--border); border-radius: .4rem; padding: 1rem; }
</style>

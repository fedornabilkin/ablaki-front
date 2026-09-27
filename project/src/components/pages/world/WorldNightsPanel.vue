<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSelect, NSpin } from 'naive-ui';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { loadNights } from '@/services/api/worldNights';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; session: number }>();
const { page, filters } = useListQuery({ outcome: '' }, { prefix: 'nights' });
const state = shallowRef<Awaited<ReturnType<typeof loadNights>> | null>(null), loading = ref(false), error = ref('');
const options = [{ value: '', label: 'Все ночи' }, { value: 'protected', label: 'Под укрытием' }, { value: 'unprotected', label: 'Без полной защиты' }];
const outcome = computed({ get: () => filters.value.outcome, set: (value: string) => { filters.value = { ...filters.value, outcome: value }; page.value = 1; } });
let generation = 0, disposed = false;
async function load() {
  const current = ++generation; state.value = null; loading.value = true; error.value = '';
  try { const result = await loadNights(props.nodeId, page.value, outcome.value); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session, page, outcome], load, { immediate: true, flush: 'sync' });
const date = (value: number) => new Date(value * 1000).toLocaleString('ru-RU');
const hours = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value / 3600);
onScopeDispose(() => { disposed = true; generation++; });
</script>
<template lang="pug">
section.world-nights#nights
  h2 Ночи и здоровье
  n-button(:loading="loading" @click="load") Обновить расчёт
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка ночей и здоровья")
  template(v-else-if="state")
    p(v-if="!state.enabled") Ночной календарь ещё не открыт. Болезнь за отсутствие укрытия пока не начисляется.
    template(v-else-if="state.policy && state.grace_until !== null && state.current_or_next_night && state.first_eligible_night")
      p Игровой день: {{ hours(state.policy.day_seconds) }} ч. Ночь: {{ hours(state.policy.night_seconds) }} ч.
      p Льготный период — до {{ date(state.grace_until) }}. Первая учитываемая ночь начинается {{ date(state.first_eligible_night.started_at) }}.
      p {{ state.current_or_next_night.started_at <= state.server_time ? 'Текущая ночь' : 'Ближайшая ночь' }}: {{ date(state.current_or_next_night.started_at) }} — {{ date(state.current_or_next_night.ended_at) }}.
      n-alert(:type="state.protection_forecast ? 'success' : 'warning'") {{ state.protection_forecast ? 'При сохранении текущего назначения и укрытия эта ночь будет защищённой.' : 'Текущее назначение не обеспечивает защиты на всю эту ночь. После льготного периода такая ночь ухудшает здоровье.' }}
      n-alert(v-if="!state.processing_available" type="warning") Обработка приостановлена. Время мира продолжается; завершённые ночи будут рассчитаны после возобновления.
      n-alert(v-else-if="state.catching_up || state.enrollment_pending" type="info") Фоновый расчёт ещё не завершён. Ниже показаны только уже обработанные результаты.
      template(v-if="state.health")
        p(v-if="state.health.severity === 0") Персонаж здоров.
        p(v-else-if="state.health.onset_at !== null") Болезнь: тяжесть {{ state.health.severity }} из {{ state.policy.max_severity }}. Начало — {{ date(state.health.onset_at) }}.
        p(v-if="state.health.severity > 0") Восстановление до снижения тяжести на один уровень: {{ state.health.recovery_progress }} из {{ state.policy.recovery_nights }} защищённых ночей подряд.
        p Незащищённых ночей после льготного периода: {{ state.health.exposure_nights }}.
        p(v-if="state.health.processed_until !== null") Здоровье рассчитано по {{ date(state.health.processed_until) }}.
      p Одна незащищённая ночь повышает тяжесть на один уровень до установленного предела. Защищённые ночи лечат бесплатно. Само назначение ночлега мгновенно не лечит.
      p Текущие награды и стоимость крафта пока сохраняются без штрафа за болезнь. Вещи и кредиты из-за болезни не списываются.
      label История ночей
        n-select(v-model:value="outcome" :options="options")
      p(v-if="!state.history.items.length") Завершённых расчётов по выбранному условию нет.
      ol.night-history(v-else)
        li(v-for="entry in state.history.items" :key="entry.id")
          strong Ночь {{ entry.sequence + 1 }} · {{ entry.outcome === 'protected' ? 'Под укрытием' : 'Без полной защиты' }}
          p {{ date(entry.started_at) }} — {{ date(entry.ended_at) }}
          p Тяжесть болезни: {{ entry.severity_before }} → {{ entry.severity_after }}.
          p(v-if="entry.outcome === 'unprotected'") Исправное назначенное укрытие не покрывало всю ночь.
      page-pager(v-model:page="page" query-prefix="nights" :result="state.history" :disabled="loading")
    p Состояние сервера на {{ date(state.server_time) }}.
</template>
<style scoped>
.world-nights { display: grid; gap: .75rem; }
.night-history { display: grid; gap: .5rem; padding-left: 1.5rem; }
.night-history li { padding: .5rem; border-bottom: 1px solid var(--border); }
label { display: grid; gap: .4rem; max-width: 28rem; }
</style>

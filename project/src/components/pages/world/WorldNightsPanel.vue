<script setup lang="ts">
import AppDialog from '@/components/AppDialog.vue';
import { worldActionButtonTheme, worldModalTheme } from '@/entities/world/theme';
import { onScopeDispose, ref, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { NAlert, NButton, NModal, NSpin } from 'naive-ui';
import { loadNights } from '@/services/api/worldNights';
import { worldError } from '@/services/api/world';

const props = defineProps<{ nodeId: number; session: number; revision?: number }>();
const route = useRoute(), show = ref(route.hash === '#nights');
const state = shallowRef<Awaited<ReturnType<typeof loadNights>> | null>(null), loading = ref(false), error = ref('');
let generation = 0, disposed = false;
async function load() {
  const current = ++generation; loading.value = true; error.value = '';
  try { const result = await loadNights(props.nodeId, 1, '', 30); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session], () => {
  generation++; state.value = null; error.value = ''; loading.value = false;
  if (show.value) void load();
}, { flush: 'sync' });
watch(() => props.revision, () => { if (show.value) void load(); });
watch(show, open => { if (open) void load(); else { generation++; loading.value = false; } }, { immediate: true });
watch(() => route.hash, hash => { if (hash === '#nights') show.value = true; });
const date = (value: number) => new Date(value * 1000).toLocaleString('ru-RU');
const hours = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value / 3600);
onScopeDispose(() => { disposed = true; generation++; });
</script>
<template lang="pug">
.world-nights
  n-button(:theme-overrides="worldActionButtonTheme" @click="show = true")
    template(#icon)
      font-awesome-icon(icon="moon")
    | Ночи и здоровье
  app-dialog(icon="moon" v-model:show="show" title="Ночи и здоровье · последние 30 ночей" class="world-nights-modal" :style="{ width: 'min(42rem, calc(100vw - 2rem))' }")
    .night-scroll(tabindex="0" aria-label="Хронология последних 30 ночей")
      n-button(:theme-overrides="worldActionButtonTheme" :loading="loading" :disabled="loading" @click="load") Обновить расчёт
      n-alert(closable v-if="error" type="error" role="alert") {{ error }}
      n-spin(v-if="loading && !state" aria-label="Загрузка ночей и здоровья")
      template(v-if="state")
        p(v-if="!state.enabled") Ночной календарь ещё не открыт. Болезнь за отсутствие укрытия пока не начисляется.
        template(v-else-if="state.policy && state.current_or_next_night && state.first_eligible_night")
          p Игровой день: {{ hours(state.policy.day_seconds) }} ч. Ночь: {{ hours(state.policy.night_seconds) }} ч.
          p(v-if="state.grace_until !== null") Льготный период — до {{ date(state.grace_until) }}. Первая учитываемая ночь — {{ date(state.first_eligible_night.started_at) }}.
          p {{ state.current_or_next_night.started_at <= state.server_time ? 'Текущая ночь' : 'Ближайшая ночь' }}: {{ date(state.current_or_next_night.started_at) }} — {{ date(state.current_or_next_night.ended_at) }}.
          n-alert(closable :type="state.protection_forecast ? 'success' : 'warning'") {{ state.protection_forecast ? 'Текущее назначение обеспечивает защиту на эту ночь.' : 'Текущее назначение не обеспечивает защиты на всю ночь.' }}
          n-alert(closable v-if="!state.processing_available" type="warning") Обработка приостановлена. Завершённые ночи будут рассчитаны после возобновления.
          n-alert(closable v-else-if="state.catching_up || state.enrollment_pending" type="info") Фоновый расчёт ещё не завершён. Показаны уже обработанные результаты.
          template(v-if="state.health")
            p(v-if="state.health.severity === 0") Персонаж здоров.
            p(v-else) Болезнь: тяжесть {{ state.health.severity }} из {{ state.policy.max_severity }}. Защищённых ночей до снижения тяжести: {{ state.health.recovery_progress }} из {{ state.policy.recovery_nights }}.
            p(v-if="state.health.work_penalty_applied") Эффективность работы: {{ state.health.work_efficiency_bps / 100 }}%.
            p Незащищённых ночей: {{ state.health.exposure_nights }}.
            p(v-if="state.health.processed_until !== null") Здоровье рассчитано по {{ date(state.health.processed_until) }}.
          p Для защиты нужно провести всю ночь в одном исправном назначенном укрытии. Защищённые ночи восстанавливают здоровье; назначение само по себе мгновенно не лечит.
          h3 Последние {{ state.history.items.length }} ночей
          p(v-if="!state.history.items.length") Завершённых расчётов пока нет.
          ol.night-history(v-else)
            li(v-for="entry in state.history.items" :key="entry.id")
              strong Ночь {{ entry.sequence + 1 }} · {{ entry.outcome === 'protected' ? 'Под укрытием' : 'Без полной защиты' }}
              p {{ date(entry.started_at) }} — {{ date(entry.ended_at) }}
              p Тяжесть болезни: {{ entry.severity_before }} → {{ entry.severity_after }}.
        p Состояние сервера на {{ date(state.server_time) }}.
    template(#footer)
      n-button(:theme-overrides="worldActionButtonTheme" @click="show = false") Закрыть
</template>
<style scoped>
.night-scroll { display: grid; gap: .75rem; max-height: min(65vh, 42rem); overflow-y: auto; overscroll-behavior: contain; padding: .25rem .75rem .25rem .25rem; }
.night-scroll p, .night-scroll h3 { margin: 0; }
.night-history { display: grid; gap: .75rem; padding-left: 1.5rem; }
.night-history li { padding: .5rem; border-bottom: 1px solid var(--border); }
.night-history li p { margin-top: .35rem; }
</style>

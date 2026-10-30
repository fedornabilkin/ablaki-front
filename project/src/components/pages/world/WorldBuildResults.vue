<script setup lang="ts">
import type { Build } from '@/services/api/simpleWorld';
import WorldCredits from './WorldCredits.vue';
defineProps<{ project: Build }>();
const duration = (seconds: number) => seconds >= 60 ? `${Math.floor(seconds / 60)} мин ${seconds % 60} с` : `${seconds} с`;
</script>
<template lang="pug">
section.build-results(v-if="project.status !== 'building'" aria-label="Результаты строительства" role="status")
  h3 {{ project.status === 'completed' ? (project.job_kind === 'repair' ? 'Ремонт завершён' : 'Строительство завершено') : 'Строительство отменено' }}
  p Общий вклад: {{ duration(project.worked_seconds) }} из {{ duration(project.required_seconds) }}.
  template(v-if="project.result")
    .build-result-totals
      div
        span Бюджет строителей
        world-credits(:value="project.result.labor_budget_cr")
      div
        span Выплачено
        world-credits(:value="project.result.paid_cr")
      div
        span Освобождено в бюджете
        world-credits(:value="project.result.released_cr")
      div
        span Всего затрачено с ценой объекта
        world-credits(:value="project.result.spent_cr")
    .build-contributors
      table(v-if="project.result.participants.length")
        thead
          tr
            th Участник
            th Вклад
            th Получено
        tbody
          tr(v-for="participant in project.result.participants" :key="participant.user_id")
            td {{ participant.name }}{{ participant.owner ? ' · владелец' : '' }}
            td {{ duration(participant.seconds) }} · {{ (100 * participant.seconds / Math.max(1, project.required_seconds)).toLocaleString('ru-RU', {maximumFractionDigits: 1}) }}%
            td
              world-credits(:value="participant.paid_cr")
      p(v-else) Работа ещё не выполнялась.
    small Оплата каждого помощника = бюджет × его вклад / необходимое время. Владелец работает бесплатно; остаток остаётся в свободном бюджете.
    p(v-if="project.status === 'cancelled' && project.job_kind !== 'repair'") Возвращено {{ project.result.material_refund_percent }}% материалов с округлением вниз. Цена объекта не возвращается.
  p(v-else) Детали расчётов для этой стройки недоступны в текущей версии сервера.
</template>
<style scoped>
.build-results { display: grid; gap: .65rem; padding: .9rem; border: 1px solid var(--border); border-radius: .65rem; background: linear-gradient(120deg, #36ad6a12, transparent); }.build-results h3, .build-results p { margin: 0; }.build-result-totals { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; }.build-result-totals > div { display: grid; gap: .25rem; }.build-result-totals span, .build-results small { color: var(--text-muted); font-size: .75rem; }.build-contributors { overflow-x: auto; }.build-contributors table { width: 100%; border-collapse: collapse; font-size: .8rem; }.build-contributors th, .build-contributors td { padding: .45rem .35rem; border-bottom: 1px solid var(--border); text-align: left; }.build-contributors th { color: var(--text-muted); }
</style>

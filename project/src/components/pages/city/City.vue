<script setup>
import { onMounted, computed } from 'vue';
import { NButton, NCard } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import { getEvent } from '@/entities/city/events';
import { useCityStore } from '@/store/city';
import BuildPanel from './BuildPanel.vue';
import CityGrid from './CityGrid.vue';
import EventsLog from './EventsLog.vue';

const city = useCityStore();

onMounted(() => {
    if (!city.loaded) city.load();
});

const stats = computed(() => [
    { key: 'balance', icon: 'fa fa-coins', label: 'Кредиты', value: Math.floor(city.balance) },
    { key: 'population', icon: 'fa fa-users', label: 'Жители (занятые/всего)', value: `${city.workReport.busyWorkers}/${city.population}` },
    { key: 'food', icon: 'fa fa-seedling', label: 'Еда (едоки/запас)', value: `${city.population}/${city.food}` },
    { key: 'income', icon: 'fa fa-arrow-up', label: 'Доход', value: `${city.incomePerHour}/ч` },
    { key: 'expenses', icon: 'fa fa-arrow-down', label: 'Содержание', value: `${city.expensesPerHour}/ч` },
]);

const isDeficit = computed(() => city.netIncomePerHour < 0);

// активные эффекты с оставшимся временем
const effects = computed(() => city.liveEffects.map((effect) => {
    const def = getEvent(effect.code);
    const left = Math.max(effect.until - city.nowTick, 0);
    const h = Math.floor(left / 3600);
    const m = Math.ceil((left % 3600) / 60);
    return {
        key: `${effect.code}-${effect.cellIndex ?? ''}`,
        icon: def?.icon ?? 'fa fa-circle',
        title: def?.title ?? effect.code,
        leftText: h > 0 ? `${h} ч ${m} мин` : `${m} мин`,
    };
}));
</script>

<template lang="pug">
  page-header(pageTitle='Строить город')
  .container.city-page
    .city-stats
      n-card.stat(v-for="s in stats" :key="s.key" :bordered="true")
        .stat-inner
          font-awesome-icon(:icon="s.icon")
          .stat-text
            .stat-value {{ s.value }}
            .stat-label {{ s.label }}
      n-card.stat.stat--collect(:bordered="true")
        .stat-inner
          .stat-text
            .stat-value +{{ city.treasury }}
            .stat-label в казне ({{ city.netIncomePerHour }}/ч чистыми)
          n-button(size="small" type="primary" :disabled="city.treasury <= 0" @click="city.collect()") Собрать

    .city-effects(v-if="effects.length || isDeficit")
      .effect.effect--deficit(v-if="isDeficit")
        font-awesome-icon(icon='fa fa-exclamation-circle')
        span Город в дефиците: содержание больше дохода, казна не растёт.
      .effect(v-for="e in effects" :key="e.key")
        font-awesome-icon(:icon="e.icon")
        span {{ e.title }} — ещё {{ e.leftText }}

    .city-feedback
      .city-error(v-if="city.lastError") {{ city.lastError }}
      .city-message(v-else-if="city.lastMessage") {{ city.lastMessage }}

    .city-main
      .city-side
        build-panel
        events-log
      city-grid

    .city-footer
      n-button(quaternary size="tiny" type="error" @click="city.reset()") Снести город и начать заново
</template>

<style lang="scss" scoped>
.city-page {
  padding-bottom: 2rem;
}

.city-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin: 1rem 0;

  @media (min-width: 48rem) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 64rem) {
    grid-template-columns: repeat(6, 1fr);
  }

  .stat-inner {
    display: flex;
    align-items: center;
    gap: 0.6rem;

    > svg {
      color: var(--primary);
      font-size: 1.2rem;
    }
  }

  .stat-value {
    font-weight: 700;
    line-height: 1.2;
  }

  .stat-label {
    color: var(--text-muted);
    font-size: 0.72rem;
  }

  .stat--collect .stat-inner {
    justify-content: space-between;
  }
}

.city-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;

  .effect {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.6rem;
    border-radius: 1rem;
    background: var(--primary-soft);
    color: var(--primary);
    font-size: 0.8rem;
    font-weight: 600;

    &--deficit {
      background: rgba(208, 48, 80, 0.12);
      color: #d03050;
    }
  }
}

.city-feedback {
  min-height: 1.4rem;
  margin-bottom: 0.5rem;

  .city-error {
    color: #d03050;
  }

  .city-message {
    color: var(--primary);
  }
}

.city-main {
  display: flex;
  flex-direction: column-reverse;
  gap: 1rem;

  @media (min-width: 64rem) {
    display: grid;
    grid-template-columns: 18rem 1fr;
    align-items: start;
  }
}

.city-side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.city-footer {
  margin-top: 1.5rem;
  text-align: center;
}
</style>

<script setup>
import { computed } from 'vue';
import { NCard } from 'naive-ui';
import { useCityStore } from '@/store/city';

const city = useCityStore();

const working = computed(() => city.workReport.working);

const isBurning = (cell) => city.disabledCells.has(cell.index);

// здание простаивает, если ему нужны работники, а очередь до него не дошла
const isIdle = (cell) => {
  if (!cell.building || cell.building.workers === 0 || isBurning(cell)) {
    return false;
  }
  return !working.value.has(cell.index);
};

const cellTitle = (cell) => {
  if (!cell.building) {
    return 'Свободный участок';
  }
  if (isBurning(cell)) {
    return `${cell.building.name} — горит, не работает`;
  }
  const idle = isIdle(cell) ? ' — простаивает, не хватает жителей' : '';
  return `${cell.building.name}${idle}`;
};
</script>

<template lang="pug">
  n-card.city-grid-card(:bordered="true" title="Город")
    .city-grid(:style="{ '--grid-size': city.gridSize }")
      .cell(
        v-for="cell in city.cells"
        :key="cell.index"
        :class="{ 'cell--empty': !cell.building, 'cell--idle': isIdle(cell), 'cell--burning': isBurning(cell), 'cell--buildable': !cell.building && city.selected && city.selected !== 'demolish' }"
        :title="cellTitle(cell)"
        @click="city.clickCell(cell.index)"
      )
        font-awesome-icon(
          v-if="cell.building"
          :icon="cell.building.icon"
          :style="{ color: cell.building.color }"
        )
        font-awesome-icon.fire-mark(v-if="isBurning(cell)" icon='fa fa-fire')
    .grid-legend
      span.legend-item
        span.legend-dot.legend-dot--idle
        |  простаивает (не хватает жителей)
      span.legend-item
        font-awesome-icon.legend-fire(icon='fa fa-fire')
        |  горит (событие «Пожар»)
</template>

<style lang="scss" scoped>
.city-grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-size), 1fr);
  gap: 0.25rem;

  .cell {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.35rem;
    background: var(--primary-soft);
    cursor: pointer;
    font-size: 1.1rem;
    transition: transform 0.1s ease, outline-color 0.1s ease;
    outline: 2px solid transparent;

    &:hover {
      transform: scale(1.05);
    }

    &--empty {
      background: var(--bg-surface, rgba(127, 127, 127, 0.08));
      border: 1px dashed var(--border, rgba(127, 127, 127, 0.3));
    }

    &--buildable:hover {
      outline-color: var(--primary);
    }

    &--idle {
      opacity: 0.45;
    }

    &--burning {
      position: relative;
      opacity: 0.6;
      outline-color: #d03050;

      .fire-mark {
        position: absolute;
        top: 0.15rem;
        right: 0.15rem;
        font-size: 0.7rem;
        color: #d03050;
      }
    }

    @media (min-width: 48rem) {
      font-size: 1.5rem;
    }
  }
}

.grid-legend {
  margin-top: 0.5rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;

  .legend-fire {
    color: #d03050;
  }

  .legend-dot {
    display: inline-block;
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
    background: var(--primary-soft);

    &--idle {
      opacity: 0.45;
      border: 1px solid var(--text-muted);
    }
  }
}
</style>

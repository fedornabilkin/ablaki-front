<script setup>
import { NCard } from 'naive-ui';
import { BUILDABLE } from '@/entities/city/buildings';
import { useCityStore } from '@/store/city';

const city = useCityStore();
</script>

<template lang="pug">
  n-card.build-panel(:bordered="true" title="Стройка")
    .panel-hint Выбери здание и кликни по свободному участку.
    .building(
      v-for="b in BUILDABLE"
      :key="b.code"
      :class="{ 'building--selected': city.selected === b.code, 'building--expensive': city.balance < b.cost }"
      @click="city.select(b.code)"
    )
      .building-icon(:style="{ background: b.color }")
        font-awesome-icon(:icon="b.icon")
      .building-text
        .building-name
          | {{ b.name }}
          span.building-cost  {{ b.cost }} кр
        .building-desc {{ b.description }}
    .building.building--demolish(
      :class="{ 'building--selected': city.selected === 'demolish' }"
      @click="city.select('demolish')"
    )
      .building-icon.demolish
        font-awesome-icon(icon='fa fa-trash-alt')
      .building-text
        .building-name Снос
        .building-desc Убирает здание, возвращает половину цены.
</template>

<style lang="scss" scoped>
.build-panel {
  .panel-hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
  }

  .building {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.5rem;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease;

    &:hover {
      border-color: var(--primary);
    }

    &--selected {
      border-color: var(--primary);
      background: var(--primary-soft);
    }

    &--expensive .building-cost {
      color: #d03050;
    }
  }

  .building-icon {
    flex-shrink: 0;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;

    &.demolish {
      background: #8a3b3b;
    }
  }

  .building-name {
    font-weight: 600;

    .building-cost {
      color: var(--text-muted);
      font-weight: 400;
      font-size: 0.85rem;
    }
  }

  .building-desc {
    color: var(--text-muted);
    font-size: 0.8rem;
    line-height: 1.35;
  }
}
</style>

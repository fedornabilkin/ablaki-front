<script setup>
import { NCard } from 'naive-ui';
import moment from 'moment';
import { getEvent } from '@/entities/city/events';
import { useCityStore } from '@/store/city';

const city = useCityStore();

const eventIcon = (code) => getEvent(code)?.icon ?? 'fa fa-circle';
const eventTime = (at) => moment.unix(at).format('DD.MM HH:mm');
</script>

<template lang="pug">
  n-card.events-log(:bordered="true" title="Хроника города")
    .log-empty(v-if="!city.eventsLog.length") Пока тихо. События случаются примерно раз в три часа.
    .log-item(v-for="(event, index) in city.eventsLog" :key="`${event.at}-${index}`")
      .log-icon
        font-awesome-icon(:icon="eventIcon(event.code)")
      .log-text
        .log-title
          | {{ event.title }}
          span.log-time  {{ eventTime(event.at) }}
        .log-desc {{ event.text }}
</template>

<style lang="scss" scoped>
.events-log {
  .log-empty {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .log-item {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.4rem 0;

    & + .log-item {
      border-top: 1px solid var(--primary-soft);
    }
  }

  .log-icon {
    flex-shrink: 0;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    background: var(--primary-soft);
    color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
  }

  .log-title {
    font-weight: 600;
    font-size: 0.9rem;

    .log-time {
      color: var(--text-muted);
      font-weight: 400;
      font-size: 0.78rem;
    }
  }

  .log-desc {
    color: var(--text-muted);
    font-size: 0.82rem;
    line-height: 1.35;
  }
}
</style>

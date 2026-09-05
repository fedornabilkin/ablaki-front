<script setup>
import { ref, computed, onMounted } from 'vue';
import { NCard, NButton, NGrid, NGi, NAlert, NTable } from 'naive-ui';
import { statApi } from '../../services/api/stat';

const leaders = [
  {
    badge: 'Отзывчивый',
    login: 'Ass238',
    url: '/wall/Ass238',
    rating: '72.9',
    description: 'Написал больше всех сообщений на форуме за предыдущий месяц.',
  },
  {
    badge: 'Король биржи',
    login: 'BORA179',
    url: '/wall/BORA179',
    rating: '155',
    description: 'Купил больше всех кредитов на бирже за предыдущий месяц.',
  },
];

const fact = {
  description: 'Хорошим комментарием на форуме заработай кредиты.',
  type: 'default',
};

const stats = ref(null);

const formatCount = (value) => {
  if (value === null || value === undefined) {
    return '—';
  }
  return Number(value).toLocaleString('ru-RU');
};

const statCards = computed(() => {
  const s = stats.value;
  return [
    {
      key: 'users',
      icon: 'fa fa-users',
      label: 'Игроков',
      value: formatCount(s ? s.users : null),
    },
    {
      key: 'games',
      icon: 'fa fa-dice',
      label: 'Игр сыграно',
      value: formatCount(s ? s.games.orel + s.games.saper : null),
    },
    {
      key: 'forum',
      icon: 'fa fa-comments',
      label: 'Сообщений на форуме',
      value: formatCount(s ? s.forum.comments : null),
    },
    {
      key: 'exchange',
      icon: 'fa fa-exchange-alt',
      label: 'Сделок на бирже',
      value: formatCount(s ? s.exchange : null),
    },
  ];
});

const topRating = computed(() => (stats.value ? stats.value.topRating : []));

// ---- топ игроков (подиум) ----
const periodFilters = [
  { key: 'all', label: 'За всё время' },
  { key: 'day', label: 'Сегодня' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'half-year', label: 'Полгода' },
];

const topPeriod = ref('all');
const topUsers = ref([]);
const topLoading = ref(false);
const topCache = new Map();

const loadTop = async (period) => {
  topPeriod.value = period;
  if (topCache.has(period)) {
    topUsers.value = topCache.get(period);
    return;
  }
  topLoading.value = true;
  try {
    const res = await statApi.top(period);
    topCache.set(period, res.list);
    if (topPeriod.value === period) {
      topUsers.value = res.list;
    }
  } catch (e) {
    if (topPeriod.value === period) {
      topUsers.value = [];
    }
  } finally {
    topLoading.value = false;
  }
};

// порядок колонок на подиуме: слева 2 место, в центре 1, справа 3
const podium = computed(() => [2, 1, 3].map((place) => {
  const user = topUsers.value[place - 1];
  return {
    place,
    username: user ? user.username : null,
    rating: user ? user.rating : null,
  };
}));

// места 4–10 списком под подиумом
const topList = computed(() => topUsers.value.slice(3, 10).map((user, index) => ({
  place: index + 4,
  username: user.username,
  rating: user.rating,
})));

onMounted(async () => {
  loadTop(topPeriod.value);
  try {
    stats.value = await statApi.index();
  } catch (e) {
    // API недоступен — карточки остаются с прочерками, топ рейтинга скрыт
  }
});
</script>

<template lang="pug">
  .main
    .container
      section.hero
        h1.hero-title Ablakin.ru — каждый день!
        p.hero-subtitle
          | Сообщество, где сначала думают, а потом пишут. Играй, общайся на форуме
          | и зарабатывай кредиты — без длинных бесполезных правил.
        .hero-actions
          router-link(to="/games/orel")
            n-button(type="primary" size="large" round)
              template(#icon)
                font-awesome-icon(icon="fa fa-arrow-right")
              | Играть
          router-link(to="/users/registration")
            n-button(size="large" round)
              template(#icon)
                font-awesome-icon(icon="fa fa-plus")
              | Регистрация
          router-link(to="/forum")
            n-button(size="large" round text)
              template(#icon)
                font-awesome-icon(icon="fa fa-comments")
              | Форум

      section.block
        h2.section-title Статистика
        n-grid(cols="2 768:4" responsive="screen" :x-gap="16" :y-gap="16")
          n-gi(v-for="card in statCards" :key="card.key")
            n-card.stat-card(:bordered="true")
              .stat
                .stat-icon
                  font-awesome-icon(:icon="card.icon")
                .stat-value {{ card.value }}
                .stat-label {{ card.label }}

      section.block
        h2.section-title Топ игроков
        .podium-filters
          n-button(
            v-for="filter in periodFilters"
            :key="filter.key"
            size="small"
            round
            :type="topPeriod === filter.key ? 'primary' : 'default'"
            :secondary="topPeriod !== filter.key"
            @click="loadTop(filter.key)"
          ) {{ filter.label }}
        .podium(:class="{ 'podium--loading': topLoading }")
          .podium-slot(v-for="slot in podium" :key="slot.place" :class="`podium-slot--${slot.place}`")
            .podium-crown(v-if="slot.place === 1")
              font-awesome-icon(icon="fa fa-crown")
            .podium-avatar
              font-awesome-icon(icon="fa fa-user")
            .podium-name
              router-link(v-if="slot.username" :to="`/wall/${slot.username}`") {{ slot.username }}
              span(v-else) —
            .podium-rating(v-if="slot.rating !== null")
              font-awesome-icon(icon="fa fa-star")
              span {{ slot.rating }}
            .podium-column
              span.podium-place {{ slot.place }}
        .top-list(v-if="topList.length" :class="{ 'top-list--loading': topLoading }")
          .top-list-row(v-for="row in topList" :key="row.username")
            span.top-list-place {{ row.place }}
            router-link.top-list-name(:to="`/wall/${row.username}`") {{ row.username }}
            span.top-list-rating
              font-awesome-icon(icon="fa fa-star")
              span {{ row.rating }}
        .podium-empty(v-if="!topLoading && !topUsers.length") Нет данных за выбранный период.

      section.block
        h2.section-title Лидеры месяца
        n-grid(cols="1 640:2" responsive="screen" :x-gap="16" :y-gap="16")
          n-gi(v-for="leader in leaders" :key="leader.login")
            n-card.leader-card(:bordered="true")
              .leader
                .leader-avatar
                  font-awesome-icon(icon="fa fa-user")
                .leader-body
                  .leader-badge
                    font-awesome-icon(icon="fa fa-trophy")
                    span {{ leader.badge }}
                  router-link.leader-login(:to="leader.url") {{ leader.login }}
                  .leader-desc {{ leader.description }}
                .leader-rating
                  font-awesome-icon(icon="fa fa-star")
                  span {{ leader.rating }}

      n-grid.lower(cols="1 1024:2" responsive="screen" :x-gap="16" :y-gap="16")
        n-gi
          section.block.block--flush
            h2.section-title Топ рейтинга
            n-card(:bordered="true")
              n-table.rating-table(v-if="topRating.length" :bordered="false" :single-line="false")
                thead
                  tr
                    th #
                    th Игрок
                    th Рейтинг
                tbody
                  tr(v-for="(row, index) in topRating" :key="row.username")
                    td {{ index + 1 }}
                    td
                      router-link(:to="`/wall/${row.username}`") {{ row.username }}
                    td.rating-value
                      font-awesome-icon(icon="fa fa-star")
                      span {{ row.rating }}
              .rating-empty(v-else) Рейтинг пока недоступен.
        n-gi
          section.block.block--flush
            h2.section-title Совет
            n-alert.fact(:type="fact.type" :show-icon="false" :closable="false")
              font-awesome-icon.fact-icon(icon="fa fa-coins")
              | {{ fact.description }}
</template>

<style lang="scss" scoped>
.main {
  padding-bottom: 2rem;
}

// ---- hero ----
.hero {
  text-align: center;
  padding: 2.5rem 0 1.5rem;

  .hero-title {
    margin: 0;
    font-size: 1.9rem;
    font-weight: 700;
    line-height: 1.2;
    color: var(--text);
  }

  .hero-subtitle {
    max-width: 40rem;
    margin: 0.85rem auto 0;
    color: var(--text-muted);
    line-height: 1.6;
  }

  // mobile-first: на телефоне кнопки крупные, во всю ширину, друг под другом
  .hero-actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    margin-top: 1.5rem;

    > a {
      width: 100%;
    }

    :deep(.n-button) {
      width: 100%;
    }
  }

  @media (min-width: 48rem) {
    padding: 3.5rem 0 2rem;

    .hero-title {
      font-size: 2.6rem;
    }

    // на планшете/десктопе кнопки в ряд по содержимому
    .hero-actions {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;

      > a,
      :deep(.n-button) {
        width: auto;
      }
    }
  }
}

// ---- секции ----
// всё начиная с «Статистики» — по центру, с боковым отступом
.block {
  margin-top: 2rem;
  padding: 0 1rem;
  text-align: center;

  // внутри сетки .lower отступы задаёт сама сетка
  &--flush {
    margin-top: 0;
    padding: 0;
    height: 100%;
  }
}

// нижняя зона: в колонки на планшете/десктопе
.lower {
  margin-top: 2rem;
  padding: 0 1rem;
}

.section-title {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0 0 1rem;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text);

  .section-note {
    font-size: 0.85rem;
    font-weight: 400;
    color: var(--text-muted);
  }
}

// ---- карточки статистики ----
.stat-card {
  height: 100%;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--primary);
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
  }

  .stat-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    background: var(--primary-soft);
    color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
  }

  .stat-label {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
}

// ---- подиум топа игроков ----
.podium-filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.podium {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 0.75rem;
  transition: opacity 0.2s ease;

  &--loading {
    opacity: 0.5;
  }

  .podium-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    width: 7.5rem;
    min-width: 0;

    // высота тумбы по месту: 1 — самая высокая, 3 — самая низкая
    &--1 {
      .podium-column {
        height: 7rem;
      }

      .podium-avatar {
        width: 4.5rem;
        height: 4.5rem;
        font-size: 2rem;
        border: 2px solid var(--primary);
      }
    }

    &--2 .podium-column {
      height: 4.75rem;
    }

    &--3 .podium-column {
      height: 3.25rem;
    }
  }

  .podium-crown {
    color: #f5c518;
    font-size: 1.5rem;
    line-height: 1;
  }

  .podium-avatar {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    background: var(--primary-soft);
    color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }

  .podium-name {
    max-width: 100%;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .podium-rating {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--primary);
    font-weight: 700;
    font-size: 0.9rem;
  }

  .podium-column {
    width: 100%;
    margin-top: 0.35rem;
    border-radius: 0.5rem 0.5rem 0 0;
    background: var(--primary-soft);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 0.5rem;

    .podium-place {
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--primary);
    }
  }

  @media (max-width: 30rem) {
    .podium-slot {
      width: 5.5rem;
    }
  }
}

.podium-empty {
  margin-top: 1rem;
  color: var(--text-muted);
}

// ---- список мест 4–10 ----
.top-list {
  max-width: 26rem;
  margin: 1.25rem auto 0;
  transition: opacity 0.2s ease;

  &--loading {
    opacity: 0.5;
  }

  .top-list-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;

    & + .top-list-row {
      border-top: 1px solid var(--primary-soft);
    }
  }

  .top-list-place {
    width: 1.75rem;
    flex-shrink: 0;
    text-align: right;
    color: var(--text-muted);
    font-weight: 700;
  }

  .top-list-name {
    flex: 1;
    min-width: 0;
    text-align: left;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .top-list-rating {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--primary);
    font-weight: 700;
    font-size: 0.9rem;
  }
}

// ---- карточки лидеров ----
.leader-card {
  height: 100%;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--primary);
  }

  .leader {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.5rem;
  }

  .leader-avatar {
    flex-shrink: 0;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background: var(--primary-soft);
    color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
  }

  .leader-body {
    flex: 1;
    min-width: 0;
  }

  .leader-badge {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.4rem;
    color: var(--primary);
    font-weight: 700;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .leader-login {
    display: inline-block;
    margin: 0.15rem 0;
    font-weight: 600;
  }

  .leader-desc {
    color: var(--text-muted);
    font-size: 0.85rem;
    line-height: 1.4;
  }

  .leader-rating {
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.35rem;
    color: var(--primary);
    font-weight: 700;
    font-size: 1.1rem;
  }
}

// ---- таблица рейтинга: надписи по центру ----
.rating-table {
  :deep(th),
  :deep(td) {
    text-align: center;
  }

  .rating-value {
    color: var(--primary);
    font-weight: 700;

    svg {
      margin-right: 0.35rem;
    }
  }
}

.rating-empty {
  color: var(--text-muted);
  padding: 0.5rem 0;
}

// ---- совет ----
.fact {
  text-align: center;

  .fact-icon {
    margin-right: 0.5rem;
    color: var(--primary);
  }
}
</style>

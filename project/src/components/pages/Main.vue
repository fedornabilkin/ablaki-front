<script setup lang="ts">
import { NCard } from 'naive-ui';
import GameTypeCards from '@/components/pages/games/GameTypeCards.vue';
import RandomTip from '@/components/RandomTip.vue';
import PrizeFund from '@/components/home/PrizeFund.vue';
import DailyActivityList from '@/components/home/DailyActivityList.vue';
import { list, emptyPage } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
import RequestState from '@/components/RequestState.vue';
import ForumThemeList from '@/components/forum/ForumThemeList.vue';
import UserList from '@/components/user/UserList.vue';
const forum = usePageRequest(() => list('forum-theme', 1, { sort: '-id', 'per-page': 10 }), emptyPage());
const users = usePageRequest(() => list('users', 1, { sort: '-created_at', 'per-page': 10 }), emptyPage());
</script>
<template lang="pug">
.container.page.stack
  section.hero
    h1 Играйте. Общайтесь.<br>Возвращайтесь к своим.
    p.muted Игры с другими участниками, обсуждения на форуме и обмен кредитами — всё в одном месте.
  section.stack(aria-labelledby="games-heading")
    h2#games-heading Игры
    game-type-cards
  prize-fund
  .split
    n-card(title="Обсуждения")
      template(#header-extra)
        router-link(to="/forum") Все темы →
      request-state(:loading="forum.loading.value" :error="forum.error.value" :empty="!forum.data.value.items.length" @retry="forum.refresh")
        forum-theme-list(:themes="forum.data.value.items")
    n-card(title="Новые участники")
      template(#header-extra)
        router-link(to="/users") Все участники →
      request-state(:loading="users.loading.value" :error="users.error.value" :empty="!users.data.value.items.length" @retry="users.refresh")
        user-list(:users="users.data.value.items")
  .cards
    daily-activity-list(kind="visitors")
    daily-activity-list(kind="bonuses")
  random-tip
</template>
<style scoped lang="scss">
.hero { padding: 1rem 0 2rem; max-width: 45rem; }
.hero h1 { font-size: clamp(2.1rem, 6vw, 3.8rem); line-height: 1.12; letter-spacing: -.035em; margin: 1rem 0; }
.hero p { font-size: 1.1rem; line-height: 1.7; max-width: 35.625rem; }
.split :deep(.n-card-header) { flex-wrap: wrap; gap: .35rem .75rem; }
.split :deep(.n-card-header__extra) { margin-left: auto; white-space: nowrap; }
</style>

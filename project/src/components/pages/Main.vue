<script setup lang="ts">
import { NCard, NTag } from 'naive-ui';
import { games } from '@/config/navigation';
import { list, emptyPage, field, date } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
import RequestState from '@/components/RequestState.vue';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
const forumQuery = useListQuery({}, { prefix: 'forum' });
const usersQuery = useListQuery({}, { prefix: 'users' });
const forum = usePageRequest(() => list('forum-theme', forumQuery.page.value, { ...forumQuery.params.value, 'per-page': 5 }), emptyPage(), [forumQuery.page, forumQuery.params]);
const users = usePageRequest(() => list('users', usersQuery.page.value, { ...usersQuery.params.value, 'per-page': 5 }), emptyPage(), [usersQuery.page, usersQuery.params]);
</script>
<template lang="pug">
.container.page.stack
  section.hero
    n-tag(type="primary" :bordered="false") Сообщество Ablakin
    h1 Играйте. Общайтесь.<br>Возвращайтесь к своим.
    p.muted Игры с другими участниками, обсуждения на форуме и обмен кредитами — всё в одном месте.
    .toolbar
      router-link.hero-link(to="/games") Выбрать игру →
      router-link.nav-item(to="/forum") Открыть форум
  section.stack(aria-labelledby="games-heading")
    h2#games-heading Игры
    .cards
      n-card(v-for="game in games" :key="game.to")
        n-tag(size="small" :bordered="false") {{ game.badge }}
        h3.mt-3 {{ game.title }}
        p.muted {{ game.description }}
        router-link.nav-item(:to="game.to") Открыть игру →
  .split
    n-card(title="Обсуждения")
      list-filters(v-model:search="forumQuery.search.value" v-model:values="forumQuery.filters.value" :loading="forum.loading.value" placeholder="Найти тему" @reset="forumQuery.reset")
      request-state(:loading="forum.loading.value" :error="forum.error.value" :empty="!forum.data.value.items.length" @retry="forum.refresh")
        .record-row(v-for="theme in forum.data.value.items" :key="theme.id")
          div
            router-link.record-title(:to="'/forum/read/' + theme.id") {{ field(theme.title) }}
            .muted {{ date(theme.last_post || theme.created_at) }}
      template(#footer)
        page-pager(v-if="!forum.error.value" v-model:page="forumQuery.page.value" :result="forum.data.value" :disabled="forum.loading.value")
        router-link(to="/forum") Все темы →
    n-card(title="Новые участники")
      list-filters(v-model:search="usersQuery.search.value" v-model:values="usersQuery.filters.value" :loading="users.loading.value" placeholder="Найти участника" @reset="usersQuery.reset")
      request-state(:loading="users.loading.value" :error="users.error.value" :empty="!users.data.value.items.length" @retry="users.refresh")
        .record-row(v-for="user in users.data.value.items" :key="user.id")
          router-link(:to="'/wall/' + encodeURIComponent(field(user.username))") {{ field(user.username) }}
          span.muted {{ date(user.created_at).split(',')[0] }}
      template(#footer)
        page-pager(v-if="!users.error.value" v-model:page="usersQuery.page.value" :result="users.data.value" :disabled="users.loading.value")
        router-link(to="/users") Все участники →
</template>
<style scoped lang="scss">
.hero { padding: 1rem 0 2rem; max-width: 720px; }
.hero h1 { font-size: clamp(2.1rem, 6vw, 3.8rem); line-height: 1.12; letter-spacing: -.035em; margin: 1rem 0; }
.hero p { font-size: 1.1rem; line-height: 1.7; max-width: 570px; }
.hero-link { padding: .8rem 1.2rem; background: var(--primary); color: var(--text-on-acc); border-radius: 10px; font-weight: 650; }
.hero-link:hover { background: var(--primary-hover); }
</style>

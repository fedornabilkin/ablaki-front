<script setup lang="ts">
import { date, field, type RecordData } from '@/services/api/portal';
import UserAvatar from '@/components/user/UserAvatar.vue';
defineProps<{ themes: RecordData[] }>();
function themeUser(theme: RecordData): RecordData | null {
  if (theme.user && typeof theme.user === 'object' && !Array.isArray(theme.user)) return theme.user as RecordData;
  if (typeof theme.first_comment_username === 'string' && theme.first_comment_username) {
    return { id: Number(theme.first_comment_user_id) || theme.id, username: theme.first_comment_username, person: { rating: 0 } } as RecordData;
  }
  if (typeof theme.last_comment_username === 'string' && theme.last_comment_username) {
    return { id: Number(theme.user_id) || theme.id, username: theme.last_comment_username, person: { rating: 0 } } as RecordData;
  }
  return null;
}
</script>
<template lang="pug">
ul.theme-list
  li.record-row(v-for="theme in themes" :key="theme.id")
    .theme-author(v-if="themeUser(theme)")
      user-avatar(:user="themeUser(theme)")
    .theme-description
      router-link.record-title(:to="'/forum/read/' + theme.id") {{ field(theme.title) }}
      .theme-preview(v-if="theme.last_comment_text") {{ field(theme.last_comment_text) }}
      .muted.theme-meta
        span(v-if="theme.last_comment_username") Последнее сообщение:
          | {{ ' ' }}
          router-link(:to="'/wall/' + encodeURIComponent(field(theme.last_comment_username))") {{ field(theme.last_comment_username) }}
        span {{ date(theme.last_comment_created_at || theme.last_post || theme.created_at) }}
    .theme-stats
      span(:aria-label="'Комментарии: ' + field(theme.comment_count)" title="Комментарии")
        font-awesome-icon(icon="comments" aria-hidden="true")
        | {{ field(theme.comment_count) }}
      span(:aria-label="'Просмотры: ' + field(theme.view)" title="Просмотры")
        font-awesome-icon(icon="eye" aria-hidden="true")
        | {{ field(theme.view) }}
</template>
<style scoped>
.theme-list { list-style: none; margin: 0; padding: 0; }
.record-row:last-child { border-bottom: 0; }
.theme-description { flex: 1 1 12rem; }
.theme-author { flex: 0 1 15rem; min-width: 12rem; }
.theme-preview { margin-top: .35rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.theme-meta { display: flex; flex-wrap: wrap; gap: .5rem; font-size: .8rem; margin-top: .3rem; }
.theme-stats, .theme-stats span { display: flex; align-items: center; gap: .4rem; }
.theme-stats { gap: 1rem; color: var(--text-muted); font-size: .8rem; }
</style>

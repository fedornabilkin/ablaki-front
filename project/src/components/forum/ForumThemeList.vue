<script setup lang="ts">
import { date, field, type RecordData } from '@/services/api/portal';
defineProps<{ themes: RecordData[] }>();
</script>
<template lang="pug">
ul.theme-list
  li.record-row(v-for="theme in themes" :key="theme.id")
    .theme-description
      router-link.record-title(:to="'/forum/read/' + theme.id") {{ field(theme.title) }}
      .theme-preview(v-if="theme.last_comment_text") {{ field(theme.last_comment_text) }}
      .muted.theme-meta
        span(v-if="theme.last_comment_username") Последнее сообщение: {{ field(theme.last_comment_username) }}
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
.theme-preview { margin-top: .35rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.theme-meta { display: flex; flex-wrap: wrap; gap: .5rem; font-size: .8rem; margin-top: .3rem; }
.theme-stats, .theme-stats span { display: flex; align-items: center; gap: .4rem; }
.theme-stats { gap: 1rem; color: var(--text-muted); font-size: .8rem; }
</style>

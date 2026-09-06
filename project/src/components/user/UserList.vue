<script setup lang="ts">
import UserAvatar from './UserAvatar.vue';
import { date, type RecordData } from '@/services/api/portal';
withDefaults(defineProps<{ users: RecordData[]; online?: boolean; showJoined?: boolean }>(), { online: undefined, showJoined: true });
</script>
<template lang="pug">
ul.user-list
  li.record-row(v-for="user in users" :key="user.id")
    user-avatar(:user="user" :online="online")
    time.joined.muted(v-if="showJoined" :title="'Дата регистрации: ' + date(user.created_at)") {{ date(user.created_at).split(',')[0] }}
</template>
<style scoped>
.user-list { list-style: none; padding: 0; margin: 0; }
.record-row { gap: .5rem 1rem; }
.record-row:last-child { border-bottom: 0; }
.joined { font-size: .8rem; }
</style>

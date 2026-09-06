<script setup lang="ts">
import { computed } from 'vue';
import { NAvatar } from 'naive-ui';
import { field, person, type RecordData } from '@/services/api/portal';
import { formatAccountNumber } from '@/services/api/header';
const props = withDefaults(defineProps<{ user: RecordData; online?: boolean }>(), { online: undefined });
const username = computed(() => field(props.user.username));
const online = computed(() => props.online ?? props.user.is_online === true);
const avatar = computed(() => {
  const value = props.user.avatar_url;
  return typeof value === 'string' && /^(https?:\/\/|\/(?!\/))/.test(value) ? value : undefined;
});
</script>
<template lang="pug">
.user-avatar
  .avatar-picture
    n-avatar(round :size="44" :src="avatar" :img-props="{ alt: '' }") {{ username.slice(0, 1).toLocaleUpperCase('ru') }}
    span.presence-dot(v-if="online" role="img" aria-label="В сети" title="В сети")
  .user-details
    router-link.user-login(:to="'/wall/' + encodeURIComponent(username)") {{ username }}
    span.user-rating(:aria-label="'Рейтинг: ' + formatAccountNumber(person(user).rating)" title="Рейтинг")
      font-awesome-icon(icon="star" aria-hidden="true")
      | {{ formatAccountNumber(person(user).rating) }}
</template>
<style scoped lang="scss">
.user-avatar { display: flex; align-items: center; gap: .75rem; min-width: 0; }
.avatar-picture { position: relative; flex: 0 0 auto; line-height: 0; }
.avatar-picture :deep(.n-avatar) { background: var(--primary-soft); color: var(--primary); font-weight: 700; }
.presence-dot { position: absolute; bottom: 0; right: -.125rem; width: .65rem; height: .65rem; border-radius: 50%; background: #79cc95; border: 2px solid var(--bg-surface); animation: presence-pulse 3s ease-in-out infinite; }
.user-details { display: grid; gap: .15rem; min-width: 0; }
.user-login { font-weight: 650; overflow-wrap: anywhere; }
.user-rating { display: flex; align-items: center; gap: .35rem; color: var(--text-muted); font-size: .8rem; }
.user-rating svg { color: var(--primary); }
@keyframes presence-pulse { 50% { opacity: .6; box-shadow: 0 0 0 .2rem rgba(121,204,149,.12); } }
@media (prefers-reduced-motion: reduce) { .presence-dot { animation: none; } }
</style>

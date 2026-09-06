<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { NButton, NModal } from 'naive-ui';
import UserList from '@/components/user/UserList.vue';
import RequestState from '@/components/RequestState.vue';
import { usePageRequest } from '@/hooks/usePageRequest';
import { onlineUsers, type RecordData } from '@/services/api/portal';
import { createPresenceHeartbeat, heartbeat, onlineCount } from '@/services/api/header';
const store = useStore();
const route = useRoute();
const router = useRouter();
const count = ref<number | null>(null);
const windowSeconds = ref<number | null>(null);
const authenticated = computed(() => !!store.getters['auth/isAuthenticated']);
const show = computed({
  get: () => route.query.online === '1',
  set: value => {
    const query = { ...route.query };
    if (value) query.online = '1';
    else {
      delete query.online;
      for (const key of Object.keys(query)) if (key.startsWith('online_')) delete query[key];
    }
    void router.push({ query, hash: route.hash }).catch(() => { /* Keep the current route on cancelled navigation. */ });
  },
});
const onlineTarget = computed(() => ({ path: route.path, query: { ...route.query, online: '1' }, hash: route.hash }));
const { data, loading, error, refresh } = usePageRequest(() => show.value ? onlineUsers() : Promise.resolve([]), [] as RecordData[], [show]);
let disposed = false;
let lastActivity = Date.now();
let countPending = false;
let lastCount = Number.NEGATIVE_INFINITY;
let timer: ReturnType<typeof setInterval> | undefined;
async function refreshCount() {
  if (disposed || countPending || document.visibilityState !== 'visible' || Date.now() - lastCount < 60_000) return;
  countPending = true; lastCount = Date.now();
  try {
    const result = await onlineCount();
    if (!disposed) { count.value = result.count; windowSeconds.value = result.windowSeconds; }
  } catch { if (!disposed) count.value = null; }
  finally { countPending = false; }
}
const ping = createPresenceHeartbeat(async () => {
  const revision = store.state.auth.revision;
  const result = await heartbeat();
  if (!disposed && revision === store.state.auth.revision) { count.value = result.count; windowSeconds.value = result.windowSeconds; }
});
function pulse() {
  if (disposed) return;
  const visible = document.visibilityState === 'visible';
  const active = authenticated.value && visible && Date.now() - lastActivity < 300_000;
  const revision = store.state.auth.revision;
  if (active) {
    void ping(true).catch(() => { if (!disposed && revision === store.state.auth.revision) count.value = null; });
  } else void refreshCount();
}
function activity() { lastActivity = Date.now(); pulse(); }
function visibilityChanged() { if (document.visibilityState === 'visible') activity(); }
watch(authenticated, () => { if (authenticated.value) activity(); });
onMounted(() => {
  pulse();
  timer = setInterval(pulse, 60_000);
  document.addEventListener('visibilitychange', visibilityChanged);
  window.addEventListener('pointerdown', activity, { passive: true });
  window.addEventListener('keydown', activity);
  window.addEventListener('scroll', activity, { passive: true });
});
onScopeDispose(() => {
  disposed = true;
  if (timer !== undefined) clearInterval(timer);
  document.removeEventListener('visibilitychange', visibilityChanged);
  window.removeEventListener('pointerdown', activity);
  window.removeEventListener('keydown', activity);
  window.removeEventListener('scroll', activity);
});
</script>
<template lang="pug">
router-link(:to="onlineTarget" custom v-slot="{ href, navigate }")
  n-button.online-button(tag="a" :href="href" quaternary @click="navigate" title="Пользователи онлайн" :aria-label="count === null ? 'Посмотреть пользователей онлайн' : 'Онлайн: ' + count + '. Посмотреть пользователей'")
    template(#icon)
      font-awesome-icon(icon="users" aria-hidden="true")
    | {{ count === null ? '—' : count }}
n-modal(v-model:show="show" preset="card" title="Пользователи онлайн" :style="{ width: 'min(38.75rem, calc(100vw - 1.5rem))' }")
  .stack
    p.muted(v-if="windowSeconds") Активность за последние {{ Math.ceil(windowSeconds / 60) }} мин.
    .online-scroll(role="region" aria-label="Список пользователей онлайн" tabindex="0")
      request-state(:loading="loading" :error="error" :empty="!data.length" @retry="refresh")
        user-list(:users="data" :online="true" :show-joined="false")
</template>
<style scoped>
.online-button { flex-shrink: 0; }
.online-scroll { max-height: min(60vh, 32rem); overflow-y: auto; overscroll-behavior: contain; padding-inline: .25rem; }
</style>

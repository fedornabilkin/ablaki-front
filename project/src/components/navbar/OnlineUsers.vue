<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { NButton, NModal } from 'naive-ui';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import RequestState from '@/components/RequestState.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { usePageRequest } from '@/hooks/usePageRequest';
import { emptyPage, field, list } from '@/services/api/portal';
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
    void router.replace({ query, hash: route.hash }).catch(() => { /* Keep the current route on cancelled navigation. */ });
  },
});
const { page, search, filters, params, reset } = useListQuery({}, { prefix: 'online' });
const { data, loading, error, refresh } = usePageRequest(() => show.value ? list('users/online', page.value, params.value) : Promise.resolve(emptyPage()), emptyPage(), [show, page, params]);
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
n-button.online-button(quaternary @click="show = true" title="Пользователи онлайн" :aria-label="count === null ? 'Посмотреть пользователей онлайн' : 'Онлайн: ' + count + '. Посмотреть пользователей'")
  span.online-dot(aria-hidden="true")
  span.online-label Онлайн: 
  span {{ count === null ? '—' : count }}
n-modal(v-model:show="show" preset="card" title="Пользователи онлайн" :style="{ width: 'min(38.75rem, calc(100vw - 1.5rem))' }")
  .stack
    p.muted(v-if="windowSeconds") Активность за последние {{ Math.ceil(windowSeconds / 60) }} мин.
    list-filters(v-model:search="search" v-model:values="filters" :loading="loading" @reset="reset")
    request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
      .record-row(v-for="user in data.items" :key="user.id")
        router-link.record-title(:to="'/wall/' + encodeURIComponent(field(user.username))") {{ field(user.username) }}
        span.muted Онлайн
    page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading")
</template>
<style scoped>
.online-button { flex-shrink: 0; }
.online-dot { width: .45rem; height: .45rem; border-radius: 50%; background: var(--primary); margin-right: .5rem; }
</style>

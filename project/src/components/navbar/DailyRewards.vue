<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref } from 'vue';
import { useStore } from 'vuex';
import { NButton, useMessage } from 'naive-ui';
import { claimDaily, errorText } from '@/services/api/portal';
import { dailyAvailability, dailyRewardDefinitions, type DailyAvailability } from '@/services/api/community';
import { usePageRequest } from '@/hooks/usePageRequest';


const store = useStore();
const message = useMessage();
const session = computed(() => store.state.auth.revision);
const available = usePageRequest<DailyAvailability>(() => store.getters['auth/isAuthenticated'] ? dailyAvailability() : Promise.resolve({ items: [], refresh_at: 0 }), { items: [], refresh_at: 0 }, [session]);
const active = computed(() => dailyRewardDefinitions.find(reward => available.data.value.items.some(item => item.id === reward.id)));
function refresh() { if (!claiming.value && !available.loading.value) void available.refresh(); }
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  window.addEventListener('focus', refresh);
  timer = setInterval(() => { if (available.data.value.refresh_at && Date.now() >= available.data.value.refresh_at * 1000) refresh(); }, 30000);
});


const claiming = ref<'bonus' | 'rating' | null>(null);
let disposed = false;
onScopeDispose(() => { disposed = true; clearInterval(timer); if (typeof window !== 'undefined') window.removeEventListener('focus', refresh); });
async function claim(kind: 'bonus' | 'rating') {
  if (claiming.value || !store.getters['auth/isAuthenticated']) return;
  claiming.value = kind;
  const revision = store.state.auth.revision;
  try {
    const received = await claimDaily(kind);
    if (disposed || revision !== store.state.auth.revision) return;
    available.data.value = { ...available.data.value, items: available.data.value.items.filter(item => item.id !== kind) };
    message[received ? 'success' : 'info'](received ? 'Ежедневная награда получена.' : 'Эта награда сегодня уже получена.');
    await available.refresh();
    try { await store.dispatch('auth/fetchData'); }
    catch { if (!disposed && revision === store.state.auth.revision) message.warning('Награда обработана, но счёт не обновился. Обновите профиль.'); }
  } catch (cause) {
    if (!disposed && revision === store.state.auth.revision) message.error(errorText(cause));
  } finally { claiming.value = null; }
}
</script>
<template lang="pug">
.daily-actions(v-if="active" aria-label="Ежедневные награды")
  n-button.bonus-button(size="tiny" secondary :loading="claiming !== null" :disabled="claiming !== null" @click="claim(active.id)" :aria-label="active.label" :title="active.label")
    template(#icon)
      font-awesome-icon(:icon="active.icon")
    span.bonus-shine(aria-hidden="true")

</template>
<style scoped>.daily-actions { display: flex; flex-shrink: 0; gap: .4rem; }.bonus-button { overflow: hidden; height: 1.75rem; padding-inline: .55rem; font-size: .75rem; }.bonus-shine { position: absolute; pointer-events: none; top: -50%; bottom: -50%; left: -80%; width: 45%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent); transform: skewX(-20deg); animation: bonus-shine 6s ease-in-out infinite; }.bonus-button:nth-child(2) .bonus-shine { animation-delay: 1s; }@keyframes bonus-shine { 25%, 100% { left: 160%; } }@media (prefers-reduced-motion: reduce) { .bonus-shine { animation: none; display: none; } }</style>

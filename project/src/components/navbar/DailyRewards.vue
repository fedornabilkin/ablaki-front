<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';
import { useStore } from 'vuex';
import { NButton, useMessage } from 'naive-ui';
import { claimDaily, errorText } from '@/services/api/portal';


const store = useStore();
const message = useMessage();


const claiming = ref<'bonus' | 'rating' | null>(null);
let disposed = false;
onScopeDispose(() => { disposed = true; });
async function claim(kind: 'bonus' | 'rating') {
  if (claiming.value || !store.getters['auth/isAuthenticated']) return;
  claiming.value = kind;
  const revision = store.state.auth.revision;
  try {
    const received = await claimDaily(kind);
    if (disposed || revision !== store.state.auth.revision) return;
    message[received ? 'success' : 'info'](received ? 'Ежедневная награда получена.' : 'Эта награда сегодня уже получена.');
    try { await store.dispatch('auth/fetchData'); }
    catch { if (!disposed && revision === store.state.auth.revision) message.warning('Награда обработана, но счёт не обновился. Обновите профиль.'); }
  } catch (cause) {
    if (!disposed && revision === store.state.auth.revision) message.error(errorText(cause));
  } finally { claiming.value = null; }
}
</script>
<template lang="pug">
.daily-actions(aria-label="Ежедневные награды")
  n-button.bonus-button(size="tiny" secondary :loading="claiming === 'bonus'" :disabled="claiming !== null" @click="claim('bonus')" aria-label="Получить ежедневный кредит" title="Получить ежедневный кредит")
    template(#icon)
      font-awesome-icon(icon="coins")
    span.bonus-shine(aria-hidden="true")
    | Бонус
  n-button.bonus-button(size="tiny" secondary :loading="claiming === 'rating'" :disabled="claiming !== null" @click="claim('rating')" aria-label="Получить ежедневный рейтинг" title="Получить ежедневный рейтинг")
    template(#icon)
      font-awesome-icon(icon="star")
    span.bonus-shine(aria-hidden="true")
    | Рейтинг

</template>
<style scoped>.daily-actions { display: flex; flex-shrink: 0; gap: .4rem; }.bonus-button { overflow: hidden; height: 1.75rem; padding-inline: .55rem; font-size: .75rem; }.bonus-shine { position: absolute; pointer-events: none; top: -50%; bottom: -50%; left: -80%; width: 45%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent); transform: skewX(-20deg); animation: bonus-shine 6s ease-in-out infinite; }.bonus-button:nth-child(2) .bonus-shine { animation-delay: 1s; }@keyframes bonus-shine { 25%, 100% { left: 160%; } }@media (prefers-reduced-motion: reduce) { .bonus-shine { animation: none; display: none; } }</style>

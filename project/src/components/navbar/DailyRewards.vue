<script setup lang="ts">
import { computed } from 'vue';
import { NButton } from 'naive-ui';
import { dailyRewardDefinitions } from '@/services/api/community';
import { useDailyRewards } from '@/hooks/useDailyRewards';
const { available, claiming, claim } = useDailyRewards();
const active = computed(() => dailyRewardDefinitions.find(reward => available.data.value.items.some(item => item.id === reward.id)));
</script>
<template lang="pug">
.daily-actions(v-if="active" aria-label="Ежедневные награды")
  n-button.bonus-button(size="tiny" secondary :loading="claiming !== null" :disabled="claiming !== null" @click="claim(active.id)" :aria-label="active.label" :title="active.label")
    template(#icon)
      font-awesome-icon(:icon="active.icon")
    span.bonus-shine(aria-hidden="true")

</template>
<style scoped>.daily-actions { display: flex; flex-shrink: 0; gap: .4rem; }.bonus-button { overflow: hidden; height: 1.75rem; padding-inline: .55rem; font-size: .75rem; }.bonus-shine { position: absolute; pointer-events: none; top: -50%; bottom: -50%; left: -80%; width: 45%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent); transform: skewX(-20deg); animation: bonus-shine 6s ease-in-out infinite; }.bonus-button:nth-child(2) .bonus-shine { animation-delay: 1s; }@keyframes bonus-shine { 25%, 100% { left: 160%; } }@media (prefers-reduced-motion: reduce) { .bonus-shine { animation: none; display: none; } }</style>

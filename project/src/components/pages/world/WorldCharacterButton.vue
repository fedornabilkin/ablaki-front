<script setup lang="ts">
import { ref } from 'vue';
import { NButton, NPopover } from 'naive-ui';
import WorldCharacterProgress from './WorldCharacterProgress.vue';
import type { MvpState } from '@/services/api/worldMvp';
defineProps<{ health?: MvpState['health']; healthError?: string; session: number }>();
const opened = ref(false);
</script>
<template lang="pug">
n-popover(trigger="click" placement="bottom-end" :style="{ maxWidth: 'min(30rem, 90vw)' }" @update:show="value => { if (value) opened = true; }")
  template(#trigger)
    n-button(size="small" circle aria-label="Персонаж: здоровье и прокачка" title="Персонаж")
      template(#icon)
        font-awesome-icon(icon="user" aria-hidden="true")
  world-character-progress(v-if="opened" :health="health" :health-error="healthError" :session="session")
  router-link.character-page-link(to="/world/character") Открыть страницу персонажа →
</template>
<style scoped>
.character-page-link { display: inline-flex; margin-top: .75rem; padding: .4rem .65rem; border: 1px solid var(--border); border-radius: .4rem; font-size: .85rem; }
</style>

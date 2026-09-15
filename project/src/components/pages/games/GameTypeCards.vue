<script setup lang="ts">
import { NCard, NTag } from 'naive-ui';
import { games } from '@/config/navigation';
</script>
<template lang="pug">
.cards
  router-link.game-link(v-for="game in games" :key="game.to" :to="game.to")
    n-card.game-card(hoverable)
      .toolbar
        font-awesome-icon.game-icon(:icon="game.icon" aria-hidden="true")
        n-tag(size="small" type="primary" :bordered="false") {{ game.badge }}
      h3.mt-3 {{ game.title }}
      p.muted {{ game.description }}
</template>
<style scoped>
.game-icon { color: var(--primary); font-size: 1.5rem; }
.game-link { display: block; color: inherit; text-decoration: none; }
.game-link:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
.game-card { height: 100%; }
</style>

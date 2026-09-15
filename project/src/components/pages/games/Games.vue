<script setup lang="ts">
import { NCard } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import { games } from '@/config/navigation';
</script>
<template lang="pug">
page-header(page-title="Игры")
.container.page.stack
  p.muted Для участия войдите в аккаунт. Ставка и доступные средства показываются перед игрой.
  .cards
    router-link.game-link(v-for="game in games" :key="game.to" :to="game.to")
      n-card.game-card(:title="game.title" hoverable)
        template(#header-extra)
          font-awesome-icon.game-icon(:icon="game.icon" aria-hidden="true")
        p {{ game.description }}
</template>
<style scoped>
.game-icon { color: var(--primary); font-size: 1.5rem; }
.game-link { display: block; color: inherit; text-decoration: none; }
.game-link:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
.game-card { height: 100%; }
</style>

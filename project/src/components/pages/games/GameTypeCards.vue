<script setup lang="ts">
import { NCard, NTag } from 'naive-ui';
import { games } from '@/config/navigation';
import GameCardRecent from './GameCardRecent.vue';
import type { HistoryGameKind } from '@/services/api/gameHistory';
defineProps<{ recent?: boolean }>();
const gameKind = (path: string) => path.split('/').pop() as HistoryGameKind;
</script>
<template lang="pug">
.cards(:class="{ 'with-recent': recent }")
  n-card.game-card(v-for="game in games" :key="game.to" hoverable)
    .game-layout(:class="{ 'with-recent': recent }")
      router-link.game-link(:to="game.to")
        .toolbar
          font-awesome-icon.game-icon(:icon="game.icon" aria-hidden="true")
          n-tag(size="small" type="primary" :bordered="false") {{ game.badge }}
        h3.mt-3 {{ game.title }}
        p.muted {{ game.description }}
      game-card-recent(v-if="recent" :kind="gameKind(game.to)")
</template>
<style scoped>
.game-icon { color: var(--primary); font-size: 1.5rem; }
.game-link { display: block; color: inherit; text-decoration: none; }
.game-link::after { content: ''; position: absolute; inset: 0; }
.game-link:focus-visible { outline: none; }
.game-link:focus-visible::after { outline: 2px solid var(--primary); outline-offset: 3px; }
.game-card { height: 100%; position: relative; }
.cards.with-recent { grid-template-columns: 1fr; }
.game-layout.with-recent { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); align-items: center; gap: 1.5rem; }
@media (max-width: 40rem) { .game-layout.with-recent { grid-template-columns: 1fr; gap: .75rem; } }
</style>

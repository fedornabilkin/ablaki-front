<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import GameTypeCards from './GameTypeCards.vue';
</script>
<template lang="pug">
page-header(page-title="Игры")
.container.page.stack
  p.muted Для участия войдите в аккаунт. Ставка и доступные средства показываются перед игрой.
  game-type-cards
</template>

<script setup lang="ts">
import { NCard, NTag } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import { games } from '@/config/navigation';
</script>
<template lang="pug">
page-header(page-title="Игры")
.container.page.stack
  p.muted Для участия войдите в аккаунт. Ставка и доступные средства показываются перед игрой.
  .cards
    n-card(v-for="game in games" :key="game.to" :title="game.title")
      p {{ game.description }}
      template(#footer)
        router-link.nav-item(:to="game.to") Открыть →
  n-card(title="Другие игры")
    .toolbar
      n-tag Дуэль
      n-tag Пятёрочка
    p.muted.mt-3 Эти игры пока недоступны на сервере. Они появятся здесь после подключения.
</template>

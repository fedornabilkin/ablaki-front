<script setup lang="ts">
import { NButton, NCard, NTag } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import { games } from '@/config/navigation';
</script>
<template lang="pug">
page-header(page-title="Игры")
.container.page.stack
  p.muted Для участия войдите в аккаунт. Ставка и доступные средства показываются перед игрой.
  .cards
    n-card(v-for="game in games" :key="game.to" :title="game.title")
      template(#header-extra)
        font-awesome-icon.game-icon(:icon="game.icon" aria-hidden="true")
      p {{ game.description }}
      template(#action)
        router-link(:to="game.to" custom v-slot="{ href, navigate }")
          n-button(tag="a" :href="href" @click="navigate" type="primary" secondary)
            template(#icon)
              font-awesome-icon(icon="arrow-right")
            | Открыть игру
  n-card(title="Другие игры")
    .toolbar
      n-tag Дуэль
      n-tag Пятёрочка
    p.muted.mt-3 Эти игры пока недоступны на сервере. Они появятся здесь после подключения.
</template>
<style scoped>
.game-icon { color: var(--primary); font-size: 1.5rem; }
</style>

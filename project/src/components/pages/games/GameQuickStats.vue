<script setup lang="ts">
import { signedAmount, type GameSummary } from '@/services/api/gameOverview';
defineProps<{ summary: GameSummary; unit: string; kind: string }>();
</script>
<template lang="pug">
.quick-stats(aria-label="Статистика игры за сегодня")
  span(:title="'Сыграно сегодня: ' + summary.today.played" :aria-label="'Сыграно сегодня: ' + summary.today.played")
    font-awesome-icon(icon="dice" aria-hidden="true")
    strong {{ summary.today.played }}
  span(:title="'Побед сегодня: ' + summary.today.wins" :aria-label="'Побед сегодня: ' + summary.today.wins")
    font-awesome-icon(icon="trophy" aria-hidden="true")
    strong {{ summary.today.wins }}
  span(:class="{ positive: summary.today.balance > 0, negative: summary.today.balance < 0 }" title="Изменение счёта за сегодня, включая создание и отмену игр" :aria-label="'Итог: ' + signedAmount(summary.today.balance) + ' ' + unit")
    font-awesome-icon(icon="coins" aria-hidden="true")
    strong {{ signedAmount(summary.today.balance) }} {{ unit }}
  router-link(:to="'/games/' + kind + '/my'" :title="'Мои доступные игры: ' + summary.own.count + ', на сумму ' + summary.own.amount + ' ' + unit" :aria-label="'Мои доступные игры: ' + summary.own.count")
    font-awesome-icon(icon="user" aria-hidden="true")
    strong {{ summary.own.count }}
</template>
<style scoped>
.quick-stats { display: flex; flex-wrap: wrap; gap: 1.25rem; padding: .6rem 1rem; border: 1px solid var(--border); border-radius: .75rem; font-variant-numeric: tabular-nums; }
.quick-stats > * { display: inline-flex; gap: .45rem; align-items: center; }
.positive { color: #69c486; }.negative { color: #e77582; }
</style>

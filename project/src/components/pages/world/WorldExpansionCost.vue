<script setup lang="ts">
import WorldCredits from '@/components/pages/world/WorldCredits.vue';
import { formatCredits } from '@/entities/world/credits';
defineProps<{
  prices: { ordinal: number; price: string; gross_price?: string }[];
  payment: { total: string; grossTotal?: string; discountAmount?: string; discountBps?: number; available: string; charge: string; walletAfter: string | null; recipient: string };
  placeLabel: string;
}>();
</script>
<template lang="pug">
div
  ul(v-if="prices.length")
    li(v-for="unit in prices" :key="unit.ordinal") {{ placeLabel }} {{ unit.ordinal }}: #[world-credits(:value="unit.price")]
  p(v-if="payment.discountAmount && payment.discountAmount !== '0.0000'") Цены позиций ниже уже учитывают скидку.
  p(v-if="payment.discountAmount && payment.discountAmount !== '0.0000'") Системная скидка {{ (payment.discountBps ?? 0) / 100 }}%: #[world-credits(:value="payment.grossTotal")]  − #[world-credits(:value="payment.discountAmount")] .
  p Всего: #[world-credits(:value="payment.total")] . Доступно в бюджете: #[world-credits(:value="payment.available")] .
  p Взнос с личного баланса в бюджет: #[world-credits(:value="payment.charge")] .
  p(v-if="payment.walletAfter !== null") Личный баланс после взноса: #[world-credits(:value="payment.walletAfter")] .
  p Затем из бюджета будет оплачено #[world-credits(:value="payment.total")]  в казну поселения «{{ payment.recipient }}».
</template>

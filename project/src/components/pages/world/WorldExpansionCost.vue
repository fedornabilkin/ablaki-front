<script setup lang="ts">
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
    li(v-for="unit in prices" :key="unit.ordinal") {{ placeLabel }} {{ unit.ordinal }}: {{ formatCredits(unit.price) }} Cr
  p(v-if="payment.discountAmount && payment.discountAmount !== '0.0000'") Цены позиций ниже уже учитывают скидку.
  p(v-if="payment.discountAmount && payment.discountAmount !== '0.0000'") Системная скидка {{ (payment.discountBps ?? 0) / 100 }}%: {{ formatCredits(payment.grossTotal) }} Cr − {{ formatCredits(payment.discountAmount) }} Cr.
  p Всего: {{ formatCredits(payment.total) }} Cr. Доступно в бюджете: {{ formatCredits(payment.available) }} Cr.
  p Взнос с личного баланса в бюджет: {{ formatCredits(payment.charge) }} Cr.
  p(v-if="payment.walletAfter !== null") Личный баланс после взноса: {{ formatCredits(payment.walletAfter) }} Cr.
  p Затем из бюджета будет оплачено {{ formatCredits(payment.total) }} Cr в казну поселения «{{ payment.recipient }}».
</template>

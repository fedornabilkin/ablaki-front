<script setup lang="ts">
import { formatAccountNumber } from '@/services/api/header';
defineProps<{ value: unknown }>();
</script>
<template lang="pug">
span {{ formatAccountNumber(value) }}
</template>

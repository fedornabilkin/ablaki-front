<script setup lang="ts">
import { computed } from 'vue';
import { NButton } from 'naive-ui';
import RequestState from '@/components/RequestState.vue';
import { usePageRequest } from '@/hooks/usePageRequest';
import { list, type RecordData } from '@/services/api/portal';
const props = defineProps<{ stake: number; balance: number; session: number }>();
defineEmits<{ select: [game: RecordData] }>();
const stakes = computed(() => [1, 2, 4].map(multiplier => Math.round(props.stake * multiplier * 100) / 100));
const options = usePageRequest(async () => Promise.all(stakes.value.map(async stake => {
  const page = await list('saper', 1, { 'filter[kon]': stake, 'per-page': 1 });
  return { stake, game: page.items[0] ?? null };
})), [] as { stake: number; game: RecordData | null }[], [stakes, () => props.session]);
</script>
<template lang="pug">
.stack
  strong Следующая игра
  request-state(:loading="options.loading.value" :error="options.error.value" @retry="options.refresh")
    .toolbar
      n-button(v-for="option in options.data.value" :key="option.stake" :disabled="!option.game || balance < option.stake" @click="option.game && $emit('select', option.game)")
        | {{ option.stake }} Кг{{ !option.game ? ' · нет игр' : balance < option.stake ? ' · недостаточно средств' : '' }}
</template>

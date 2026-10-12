<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import type { WorldNode } from '@/entities/world/types';
import { formatCredits } from '@/entities/world/credits';
import { budget } from '@/services/api/simpleWorld';
import { loadNodeEconomy } from '@/services/api/worldEconomy';
const props = defineProps<{ node: WorldNode; session: number; revision: number }>();
const available = ref<string | null>(null), reserved = ref<string | null>(null), treasury = ref<string | null>(null), failed = ref(false);
let generation = 0;
watch(() => [props.node.id, props.session, props.revision], async (value, oldValue) => {
  const current = ++generation;
  if (!oldValue || value[0] !== oldValue[0] || value[1] !== oldValue[1]) available.value = reserved.value = treasury.value = null;
  failed.value = false;
  const results = await Promise.allSettled([
    props.node.owned_by_me ? budget(props.node.id) : Promise.resolve(null),
    props.node.permissions.manage ? loadNodeEconomy(props.node.id, 1) : Promise.resolve(null),
  ]);
  if (current !== generation) return;
  const [building, economy] = results;
  if (building.status === 'fulfilled' && building.value) {
    available.value = building.value.available; reserved.value = building.value.reserved;
  }
  if (economy.status === 'fulfilled' && economy.value?.balances) {
    treasury.value = economy.value.balances.treasury;
    if (available.value === null) { available.value = economy.value.balances.available; reserved.value = economy.value.balances.reserved; }
  }
  failed.value = results.some(result => result.status === 'rejected');
}, { immediate: true });
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
.hero-finances(:title="failed ? 'Не удалось загрузить часть финансовых данных' : undefined" aria-live="polite")
  div
    span Бюджет
    strong {{ available === null ? '—' : `${formatCredits(available)} Cr` }}
    small(v-if="reserved !== null") Резерв: {{ formatCredits(reserved) }} Cr
  div
    span Казна
    strong {{ treasury === null ? '—' : `${formatCredits(treasury)} Cr` }}
</template>
<style scoped>
.hero-finances { display: flex; flex-wrap: wrap; gap: 1.5rem; }.hero-finances > div { display: grid; align-content: start; gap: .2rem; min-width: 5rem; }.hero-finances span, .hero-finances small { color: var(--text-muted); font-size: .8rem; }.hero-finances strong { font-variant-numeric: tabular-nums; }
</style>

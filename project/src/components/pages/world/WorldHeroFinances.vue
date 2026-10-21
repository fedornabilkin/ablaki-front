<script setup lang="ts">
import WorldCredits from '@/components/pages/world/WorldCredits.vue';
import { onScopeDispose, ref, watch } from 'vue';
import type { WorldNode } from '@/entities/world/types';
import { formatCredits } from '@/entities/world/credits';
import { budget } from '@/services/api/simpleWorld';
import { loadNodeEconomy } from '@/services/api/worldEconomy';
import { loadWorldHome } from '@/services/api/worldHome';
const props = defineProps<{ node?: WorldNode; nodeId?: number; owner: number; session: number; revision: number }>();
const available = ref<string | null>(null), reserved = ref<string | null>(null), treasury = ref<string | null>(null), failed = ref(false);
let generation = 0;
watch(() => [props.node?.id ?? props.nodeId, props.session, props.revision, props.owner], async (value, oldValue) => {
  const current = ++generation;
  if (!oldValue || value[0] !== oldValue[0] || value[1] !== oldValue[1] || value[3] !== oldValue[3]) available.value = reserved.value = treasury.value = null;
  failed.value = false;
  let id = props.node?.id ?? props.nodeId;
  if (!id) {
    try { id = (await loadWorldHome(props.owner, props.session))?.id; }
    catch { if (current === generation) failed.value = true; return; }
  }
  if (!id || current !== generation) return;
  const results = await Promise.allSettled([loadNodeEconomy(id, 1)]);
  if (current !== generation) return;
  const [economy] = results;
  if (economy.status === 'fulfilled' && economy.value?.balances) {
    treasury.value = economy.value.balances.treasury;
    available.value = economy.value.balances.available; reserved.value = economy.value.balances.reserved;
  }
  failed.value = results.some(result => result.status === 'rejected');
  if (economy.status === 'fulfilled' && !economy.value?.balances && (!props.node || props.node.owned_by_me)) {
    try { const building = await budget(id); if (current === generation) { available.value = building.available; reserved.value = building.reserved; } }
    catch { if (current === generation) failed.value = true; }
  }
}, { immediate: true });
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
.hero-finances(:title="failed ? 'Не удалось загрузить часть финансовых данных' : undefined" aria-live="polite")
  div
    span Бюджет
    strong
      world-credits(v-if="available !== null" :value="available")
      template(v-else) —
    small(v-if="reserved !== null") Резерв: #[world-credits(:value="reserved")]
  div
    span Казна
    strong
      world-credits(v-if="treasury !== null" :value="treasury")
      template(v-else) —
</template>
<style scoped>
.hero-finances { display: flex; flex-wrap: wrap; gap: 1.5rem; }.hero-finances > div { display: grid; align-content: start; gap: .2rem; min-width: 5rem; }.hero-finances span, .hero-finances small { color: var(--text-muted); font-size: .8rem; }.hero-finances strong { font-variant-numeric: tabular-nums; }
</style>

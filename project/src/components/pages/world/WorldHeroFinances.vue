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
const treasuryEnabled = ref(false);
let generation = 0;
watch(() => [props.node?.id ?? props.nodeId, props.session, props.revision, props.owner], async (value, oldValue) => {
  const current = ++generation;
  if (!oldValue || value[0] !== oldValue[0] || value[1] !== oldValue[1] || value[3] !== oldValue[3]) available.value = reserved.value = treasury.value = null;
  failed.value = false;
  let id = props.node?.id ?? props.nodeId;
  if (props.node?.has_finances === false) { available.value = reserved.value = treasury.value = null; return; }
  if (props.node && !props.node.owned_by_me && !props.node.permissions.manage) return;
  if (!id) {
    try { id = (await loadWorldHome(props.owner, props.session))?.id; }
    catch { if (current === generation) failed.value = true; return; }
  }
  if (!id || current !== generation) return;
  const results = await Promise.allSettled([loadNodeEconomy(id, 1)]);
  if (current !== generation) return;
  const [economy] = results;
  if (economy.status === 'fulfilled' && economy.value?.balances) {
    treasuryEnabled.value = economy.value.treasury_enabled;
    treasury.value = economy.value.balances.treasury;
    available.value = economy.value.balances.available; reserved.value = economy.value.balances.reserved;
  }
  failed.value = results.some(result => result.status === 'rejected');
  if (economy.status === 'fulfilled' && economy.value?.has_finances !== false && !economy.value?.balances && (!props.node || props.node.owned_by_me)) {
    try { const building = await budget(id); if (current === generation) { available.value = building.available; reserved.value = building.reserved; } }
    catch { if (current === generation) failed.value = true; }
  }
}, { immediate: true });
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
dl.hero-finances(v-if="available !== null || treasury !== null" :title="failed ? 'Не удалось загрузить часть финансовых данных' : undefined" aria-label="Финансы объекта" aria-live="polite")
  .hero-finances__item
    dt Бюджет
    dd
      world-credits(v-if="available !== null" :value="available")
      template(v-else) —
  .hero-finances__item(v-if="treasuryEnabled")
    dt Казна
    dd
      world-credits(v-if="treasury !== null" :value="treasury")
      template(v-else) —
  .hero-finances__item
    dt Резерв
    dd
      world-credits(v-if="reserved !== null" :value="reserved")
      template(v-else) —
</template>
<style scoped>
.hero-finances { display: flex; flex-wrap: wrap; gap: .5rem 1.1rem; margin: 0; font-variant-numeric: tabular-nums; }
.hero-finances__item { display: grid; gap: .2rem; }
.hero-finances dt { color: var(--text-muted); font-size: .75rem; }
.hero-finances dd { margin: 0; font-size: .9rem; font-weight: 650; }
</style>

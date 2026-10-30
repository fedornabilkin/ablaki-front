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
table.hero-finances(v-if="available !== null || treasury !== null" :title="failed ? 'Не удалось загрузить часть финансовых данных' : undefined" aria-label="Финансы объекта" aria-live="polite")
  thead
    tr
      th(scope="col") Бюджет
      th(scope="col") Казна
      th(scope="col") Резерв
  tbody
    tr
      td
        world-credits(v-if="available !== null" :value="available")
        template(v-else) —
      td
        world-credits(v-if="treasury !== null" :value="treasury")
        template(v-else) —
      td
        world-credits(v-if="reserved !== null" :value="reserved")
        template(v-else) —
</template>
<style scoped>
.hero-finances { width: auto; margin: 0; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.hero-finances th, .hero-finances td { padding: .2rem .75rem; text-align: right; white-space: nowrap; }
.hero-finances th { color: var(--text-muted); font-size: .75rem; font-weight: 500; border-bottom: 1px solid var(--border); }
.hero-finances td { font-size: .9rem; font-weight: 650; }
.hero-finances th:first-child, .hero-finances td:first-child { padding-left: 0; text-align: left; }
.hero-finances th:last-child, .hero-finances td:last-child { padding-right: 0; }
</style>

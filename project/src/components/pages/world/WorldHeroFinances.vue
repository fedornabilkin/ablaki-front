<script setup lang="ts">
import WorldCredits from '@/components/pages/world/WorldCredits.vue';
import AppPopover from '@/components/AppPopover.vue';
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
app-popover(v-if="available !== null || treasury !== null" trigger="click" placement="bottom-start")
  template(#trigger)
    button.hero-finances-trigger(type="button" title="Финансы объекта" :aria-label="`Бюджет: ${available === null ? 'нет данных' : formatCredits(available) + ' кредитов'}. Открыть финансы объекта`")
      span.hero-finances-label Бюджет
      world-credits(v-if="available !== null" :value="available")
      span(v-else) —
      font-awesome-icon.hero-finances-warning(v-if="failed" icon="exclamation-circle" aria-label="Не все данные загружены")
  dl.hero-finances(aria-label="Финансы объекта" aria-live="polite")
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
  p.hero-finances-note(v-if="failed" role="status") Не удалось загрузить часть финансовых данных.
</template>
<style scoped>
.hero-finances-trigger { display: inline-flex; align-items: center; gap: .5rem; min-height: 2.75rem; padding: .35rem .25rem; border: 0; border-radius: .5rem; background: transparent; color: var(--text); font-weight: 650; font-size: .875rem; cursor: pointer; }
.hero-finances-trigger:hover { background: var(--primary-soft); }
.hero-finances-trigger :deep(.world-credits > svg) { color: var(--primary); }
.hero-finances-label { display: none; color: var(--text-muted); font-size: .75rem; font-weight: 400; }
.hero-finances-warning { color: var(--primary); }
.hero-finances { display: grid; gap: .65rem; min-width: 12rem; margin: 0; font-variant-numeric: tabular-nums; }
.hero-finances__item { display: flex; align-items: baseline; justify-content: space-between; gap: 1.5rem; }
.hero-finances dt { color: var(--text-muted); font-size: .8125rem; }
.hero-finances dd { margin: 0; font-size: .875rem; font-weight: 650; }
.hero-finances-note { max-width: 16rem; margin: .75rem 0 0; color: var(--text-muted); font-size: .8125rem; }
@media(min-width: 64rem) { .hero-finances-label { display: inline; } }
</style>

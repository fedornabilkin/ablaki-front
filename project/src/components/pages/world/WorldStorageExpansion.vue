<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton } from 'naive-ui';
import { loadEconomyStorage, previewEconomyStorage, type EconomyStorageState } from '@/services/api/worldEconomyStorage';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import type { WorldQuote } from '@/entities/world/types';
import { worldError } from '@/services/api/world';
import { formatCredits, creditCost } from '@/entities/world/credits';
const props = defineProps<{ storage: number; session: number; revision: number; writable: boolean; command: WorldCommandRunner }>();
const emit = defineEmits<{ changed: [] }>();
const state = ref<EconomyStorageState | null>(null), selected = ref<string | null>(null), quote = ref<WorldQuote | null>(null), loading = ref(false), loadingState = ref(false), error = ref('');
const blocked = computed(() => loading.value || loadingState.value || !props.writable || props.command.busy.value || !!props.command.pending.value || !state.value?.writable);
let generation = 0;
async function load() {
  const current = ++generation; selected.value = null; quote.value = null; state.value = null; loading.value = false; loadingState.value = true; error.value = '';
  try { const result = await loadEconomyStorage(props.storage); if (current === generation) state.value = result; }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) loadingState.value = false; }
}
async function choose(code: string) {
  if (blocked.value) return;
  const current = generation; loading.value = true; error.value = ''; quote.value = null;
  try { const result = await previewEconomyStorage(props.storage, code); if (current === generation) { selected.value = code; quote.value = result; } }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) loading.value = false; }
}
async function confirm() {
  if (!selected.value || !quote.value || blocked.value) return;
  const current = generation, code = selected.value, accepted = quote.value; quote.value = null;
  await props.command.submit(`/economy/storage/${props.storage}/expand`, { code }, accepted);
  if (current === generation && !props.command.pending.value && !props.command.error.value) { emit('changed'); await load(); }
}
watch(() => [props.storage, props.session, props.revision], () => { generation++; loading.value = false; error.value = ''; void load(); }, { immediate: true });
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
section.storage-expansion(v-if="state?.options.length || error" aria-label="Расширение хранилища" :aria-busy="loadingState")
  n-alert(v-if="error" type="error") {{ error }}
  n-button(v-if="error" :loading="loadingState" :disabled="loadingState" @click="load") Повторить загрузку
  p(v-if="state") Постоянная вместимость: {{ state.capacity }}. Пакет оплачивается с личного баланса.
  .storage-expansion-options(v-if="state")
    n-button(v-for="pack in state.options" :key="pack.code" size="small" :disabled="blocked" :aria-pressed="selected === pack.code" @click="choose(pack.code)") +{{ pack.slots }} мест{{ creditCost(pack.price) }}
  p(v-if="quote") Новая вместимость: {{ quote.terms.capacity_after }}. Стоимость: {{ formatCredits(String(quote.terms.price_cr)) }} Cr.
  n-button(v-if="quote" :disabled="blocked" @click="confirm") Оплатить расширение
</template>
<style scoped>
.storage-expansion { display: grid; gap: .5rem; min-width: 0; }.storage-expansion p { margin: 0; }.storage-expansion-options { display: flex; flex-wrap: wrap; gap: .5rem; }
</style>

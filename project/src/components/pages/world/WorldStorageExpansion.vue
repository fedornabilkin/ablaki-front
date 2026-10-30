<script setup lang="ts">
import AppPopover from '@/components/AppPopover.vue';
import WorldCredits from '@/components/pages/world/WorldCredits.vue';
import { worldActionButtonTheme } from '@/entities/world/theme';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton, NInputNumber } from 'naive-ui';
import { loadEconomyStorage, previewEconomyStorage, type EconomyStorageState } from '@/services/api/worldEconomyStorage';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import type { WorldQuote } from '@/entities/world/types';
import { worldError } from '@/services/api/world';
import { formatCredits, creditCost } from '@/entities/world/credits';
import WorldPaymentSources from './WorldPaymentSources.vue';
const props = defineProps<{ storage: number; session: number; revision: number; writable: boolean; command: WorldCommandRunner; cell?: boolean }>();
const emit = defineEmits<{ changed: [] }>();
const state = ref<EconomyStorageState | null>(null), selected = ref<string | null>(null), quote = ref<WorldQuote | null>(null), loading = ref(false), loadingState = ref(false), error = ref('');
const quantity = ref<number | null>(1), receipt = ref('');
const opened = ref(false);
const backpack = computed(() => state.value?.kind === 'backpack' || state.value?.options[0]?.code.startsWith('backpack-'));
const pack = computed(() => state.value?.options.find(option => option.slots === quantity.value));
watch(quantity, () => { selected.value = null; quote.value = null; });
const blocked = computed(() => loading.value || loadingState.value || !props.writable || props.command.busy.value || !!props.command.pending.value || !state.value?.writable);
let generation = 0, disposed = false;
async function load() {
  const current = ++generation; selected.value = null; quote.value = null; state.value = null; quantity.value = 1; loading.value = false; loadingState.value = true; error.value = '';
  try { const result = await loadEconomyStorage(props.storage); if (current === generation) state.value = result; }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) loadingState.value = false; }
}
async function choose(code: string) {
  if (blocked.value) return;
  const current = generation; loading.value = true; error.value = ''; receipt.value = ''; quote.value = null;
  try { const result = await previewEconomyStorage(props.storage, code); if (current === generation && (!backpack.value || pack.value?.code === code)) { selected.value = code; quote.value = result; } }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) loading.value = false; }
}
async function confirm() {
  if (!selected.value || !quote.value || blocked.value) return;
  const current = generation, storage = props.storage, session = props.session, code = selected.value, accepted = quote.value; quote.value = null;
  const result = await props.command.submit(`/economy/storage/${props.storage}/expand`, { code }, accepted);
  if (result && !disposed && storage === props.storage && session === props.session) { receipt.value = `Добавлено постоянных мест: ${accepted.terms.slots}.`; emit('changed'); if (current === generation) await load(); }
}
watch(() => [props.storage, props.session, props.revision], () => { generation++; loading.value = false; error.value = ''; void load(); }, { immediate: true });
watch(() => [props.storage, props.session], () => { receipt.value = ''; opened.value = false; });
onScopeDispose(() => { disposed = true; generation++; });
</script>
<template lang="pug">
component(v-if="state?.options.length || error || loadingState || receipt" :is="cell ? AppPopover : 'section'" v-bind="cell ? { trigger: 'click', placement: 'bottom', show: opened, width: '22rem' } : {}" @update:show="opened = $event")
  template(v-if="cell" #trigger)
    button.storage-add-cell(type="button" aria-label="Расширить хранилище" title="Добавить постоянные слоты" :disabled="loadingState || !writable || command.busy.value || !!command.pending.value")
      font-awesome-icon(icon="plus" aria-hidden="true")
      span Добавить слоты
  section.storage-expansion(:class="{ 'storage-expansion-popover': cell }" aria-label="Расширение хранилища" :aria-busy="loadingState" @keydown.esc.stop="opened = false")
    button.expansion-close(v-if="cell" type="button" aria-label="Закрыть расширение хранилища" @click="opened = false")
      font-awesome-icon(icon="times" aria-hidden="true")
    strong(v-if="cell") Расширить хранилище
    n-alert(closable v-if="error" type="error") {{ error }}
    n-button(v-if="error" :loading="loadingState" :disabled="loadingState" @click="load") Повторить загрузку
    p(v-if="loadingState" role="status") Загружаем стоимость слотов…
    template(v-if="state?.options.length")
      p Постоянная вместимость: {{ state.capacity }}. Оплата с личного баланса.
      template(v-if="backpack")
        p Каждый следующий постоянный слот дороже.
        label.slot-quantity Количество слотов
          n-input-number(v-model:value="quantity" :min="1" :max="state.options.length" :precision="0" :disabled="blocked" aria-label="Количество покупаемых слотов")
        p Стоимость: #[world-credits(:value="pack?.price ?? '—'")]
        n-button(:theme-overrides="worldActionButtonTheme" :loading="loading" :disabled="blocked || !pack" @click="pack && choose(pack.code)") Рассчитать покупку
      .storage-expansion-options(v-else)
        n-button(v-for="pack in state.options" :key="pack.code" size="small" :disabled="blocked" :aria-pressed="selected === pack.code" @click="choose(pack.code)") +{{ pack.slots }} мест#[world-credits(:value="pack.price ?? '0'" cost)]
      p(v-if="quote") Новая вместимость: {{ quote.terms.capacity_after }}. Стоимость: #[world-credits(:value="String(quote.terms.price_cr)")] .
      world-payment-sources(v-if="quote" mode="personal" :price="String(quote.terms.price_cr)")
      n-button(v-if="quote" :theme-overrides="worldActionButtonTheme" :loading="command.busy.value" :disabled="blocked" @click="confirm") Оплатить расширение
    p(v-if="receipt" role="status") {{ receipt }}
</template>
<style scoped>
.storage-expansion { display: grid; gap: .5rem; min-width: 0; }.storage-expansion p { margin: 0; }.storage-expansion-options { display: flex; flex-wrap: wrap; gap: .5rem; }
.slot-quantity { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }.slot-quantity :deep(.n-input-number) { max-width: 9rem; }
.storage-expansion-popover { position: relative; width: 100%; color: var(--text); gap: .6rem; }
.storage-expansion-popover > strong { padding-right: 2rem; }
.storage-add-cell { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .5rem; min-width: 0; min-height: 100px; padding: .55rem; border: 1px dashed var(--primary); border-radius: .5rem; background: var(--primary-soft); color: var(--primary); cursor: pointer; }
.storage-add-cell svg { font-size: 1.5rem; }.storage-add-cell span { font-size: .75rem; }
.storage-add-cell:disabled { opacity: .5; cursor: default; }.storage-add-cell:focus-visible, .expansion-close:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.expansion-close { position: absolute; top: -.25rem; right: -.25rem; display: grid; place-items: center; width: 2rem; height: 2rem; padding: 0; border: 0; border-radius: .4rem; color: var(--text-muted); background: transparent; cursor: pointer; }
.expansion-close:hover { color: var(--text); background: var(--primary-soft); }
@media(max-width: 620px) { .slot-quantity { flex-wrap: wrap; gap: .4rem; } }
</style>

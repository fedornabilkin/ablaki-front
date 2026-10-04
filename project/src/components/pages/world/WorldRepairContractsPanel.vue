<script setup lang="ts">
import { formatCredits } from '@/entities/world/credits';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NSpin } from 'naive-ui';
import { RouterLink } from 'vue-router';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadRepairContracts, previewRepairContract } from '@/services/api/worldRepairContracts';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; session: number; writable: boolean; command: WorldCommandRunner }>();
const list = useListQuery({}, { prefix: 'repairContracts' }), { page, search, filters } = list;
const params = computed(() => ({ page: page.value, q: list.params.value.q || '' }));
const state = shallowRef<Awaited<ReturnType<typeof loadRepairContracts>> | null>(null), quote = shallowRef<Awaited<ReturnType<typeof previewRepairContract>> | null>(null);
const loading = ref(false), calculating = ref(false), error = ref(''), { busy, pending } = props.command;
const locked = computed(() => busy.value || Boolean(pending.value) || !props.writable || !state.value?.writable || !state.value?.eligible);
let generation = 0, previewGeneration = 0, disposed = false;
function clear() { previewGeneration++; quote.value = null; calculating.value = false; }
async function load() {
  const current = ++generation; clear(); state.value = null; loading.value = true; error.value = '';
  try { const value = await loadRepairContracts(props.nodeId, params.value); if (!disposed && current === generation) state.value = value; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session, params], load, { immediate: true, flush: 'sync' });
watch([busy, () => props.writable], clear, { flush: 'sync' });
async function preview(offer: number) {
  if (locked.value || calculating.value || loading.value) return;
  clear(); const current = previewGeneration; calculating.value = true; error.value = '';
  try { const value = await previewRepairContract(props.nodeId, offer); if (!disposed && current === previewGeneration) quote.value = value; }
  catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
function confirm() {
  if (!quote.value || locked.value || loading.value || calculating.value) return;
  void props.command.submit(`/nodes/${quote.value.node}/repair-contract`, quote.value.input, quote.value.quote);
}
const date = (timestamp: number) => new Date(timestamp * 1000).toLocaleString('ru-RU');
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.world-repair-contracts#repair-contracts
  h2 Договор ремонта
  n-button(:loading="loading" :disabled="busy || Boolean(pending)" @click="load") Обновить договоры
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка договоров ремонта")
  template(v-else-if="state")
    template(v-if="state.contract")
      p {{ state.contract.source === 'purchase' ? 'Договор включён в покупку' : 'Дополнительный договор принят' }}: {{ date(state.contract.accepted_at) }}.
      p Полный ремонт: {{ formatCredits(state.contract.repair.full_price) }} Cr из бюджета здания. Цена и сырьё уменьшаются пропорционально повреждению с округлением вверх.
      ul
        li(v-for="item in state.contract.repair.materials" :key="item.item_id") {{ item.name }}: {{ item.quantity }} при полном повреждении
    ul(v-if="state.reasons.length")
      li(v-for="reason in state.reasons" :key="reason") {{ reason }}
    template(v-if="state.eligible")
      p Выберите договор исходного поселения. Здесь показаны предложения для того же типа и площади постройки. Принятие бесплатно; каждый ремонт оплачивается отдельно.
      list-filters(v-model:search="search" v-model:values="filters" :filters="[]" :loading="loading" placeholder="Найти договор" @reset="list.reset")
      p(v-if="!state.items.length") Подходящих предложений по выбранным условиям нет. Поселение может опубликовать их в каталоге построек.
      article(v-for="item in state.items" :key="item.offer_id")
        h3 {{ item.name }}
        p Полный ремонт: {{ formatCredits(item.repair.full_price) }} Cr. Площадь: {{ item.area }}.
        ul
          li(v-for="material in item.repair.materials" :key="material.item_id") {{ material.name }}: {{ material.quantity }}
        ul(v-if="item.reasons.length")
          li(v-for="reason in item.reasons" :key="reason") {{ reason }}
        n-button(:disabled="locked || calculating || !item.available" @click="preview(item.offer_id)") Рассмотреть договор…
      page-pager(v-model:page="page" query-prefix="repairContracts" :result="state" :disabled="busy")
  n-alert(v-if="quote" type="info" aria-live="polite")
    h3 Принять договор для «{{ quote.buildingName }}»
    p Принятие: 0 Cr. Стоимость полного ремонта: {{ formatCredits(quote.offer.repair.full_price) }} Cr из бюджета здания.
    p
      | Подрядчик и получатель оплаты:
      |  
      router-link(:to="`/world/nodes/${quote.recipient.id}`") {{ quote.recipient.name }}
    ul
      li(v-for="material in quote.offer.repair.materials" :key="material.item_id") {{ material.name }}: {{ material.quantity }} при полном повреждении
    p Фактическая цена и расход сырья пропорциональны повреждению и округляются вверх. Материалы предоставляет владелец из рюкзака.
    p Условия закрепятся за зданием и сохранятся после снятия предложения с продажи. Заменить действующий договор этим действием нельзя. Сам ремонт выполняется отдельно.
    n-button(type="primary" :disabled="locked" @click="confirm") Принять договор
    n-button(:disabled="busy" @click="clear") Отмена
</template>
<style scoped>
.world-repair-contracts { display: grid; gap: .75rem; }
article { border: 1px solid var(--border); border-radius: .4rem; padding: 1rem; }
</style>

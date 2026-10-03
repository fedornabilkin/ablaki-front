<script setup lang="ts">
import { formatCredits } from '@/entities/world/credits';
import { computed, onScopeDispose, reactive, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NInput, NInputNumber, NSelect, NSpin } from 'naive-ui';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadPremises, previewPremises, type PremisesAction } from '@/services/api/worldPremises';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; session: number; writable: boolean; command: WorldCommandRunner }>();
const list = useListQuery({}, { prefix: 'premises' }), { page, search, filters } = list;
const params = computed(() => ({ page: page.value, q: list.params.value.q || '' }));
const state = shallowRef<Awaited<ReturnType<typeof loadPremises>> | null>(null), quote = shallowRef<Awaited<ReturnType<typeof previewPremises>> | null>(null);
const form = reactive({ name: '', kind: 'canopy' as 'canopy' | 'workroom' | 'house' | 'forge' | 'workshop' | 'warehouse', area: null as number | null, slots: null as number | null, price: '', expansion_limit: null as number | null, expansion_base_price: '' });
const kinds = [{ value: 'canopy', label: 'Навес' }, { value: 'workroom', label: 'Мастерская' }, { value: 'house', label: 'Дом с койкой' }, { value: 'forge', label: 'Кузница' }, { value: 'workshop', label: 'Столярная мастерская' }, { value: 'warehouse', label: 'Большой склад' }];
const equipmentArea = computed(() => Math.max(1, (form.area || 4) - (form.kind === 'house' ? 1 : 0)));
const error = ref(''), loading = ref(false), calculating = ref(false), { busy, pending } = props.command;
const locked = computed(() => busy.value || Boolean(pending.value) || !props.writable);
let generation = 0, previewGeneration = 0, disposed = false;
function clear() { previewGeneration++; quote.value = null; calculating.value = false; }
async function load() {
  const current = ++generation; clear(); state.value = null; loading.value = true; error.value = '';
  try { const result = await loadPremises(props.nodeId, params.value); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session, params], load, { immediate: true, flush: 'sync' });
watch([busy, () => props.writable], clear, { flush: 'sync' });
watch(form, clear, { flush: 'sync' });
watch([() => props.nodeId, () => props.session], () => { form.name = ''; form.kind = 'canopy'; form.area = null; form.slots = null; form.price = ''; form.expansion_limit = null; form.expansion_base_price = ''; }, { flush: 'sync' });
async function preview(action: PremisesAction, offer?: number) {
  if (locked.value || calculating.value || (action === 'buy' ? !state.value?.can_buy : !state.value?.can_publish)) return;
  clear(); const current = previewGeneration; calculating.value = true; error.value = '';
  try {
    const result = await previewPremises(props.nodeId, action, action === 'publish' ? { ...form, expansion_base_price: form.expansion_base_price || null } : { offer_id: offer });
    if (!disposed && current === previewGeneration) quote.value = result;
  } catch (cause) { if (!disposed && current === previewGeneration) error.value = cause instanceof Error && cause.message.startsWith('invalid-') ? 'Проверьте название, цены и площадь. Включённые места и предел расширения не должны превышать площадь; расширяемому помещению нужна базовая цена.' : worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
function confirm() {
  if (!quote.value || locked.value) return;
  void props.command.submit(`/nodes/${props.nodeId}/premises-${quote.value.action}`, { ...quote.value.input }, quote.value.quote);
}
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.world-premises#premises
  h2 Помещения и жильё
  p Помещение можно купить готовым или построить по опубликованным условиям. Оплата — из бюджета площадки. Станции и сундуки переносятся в готовую комнату отдельно.
  n-button(:loading="loading" :disabled="busy || Boolean(pending)" @click="load") Обновить предложения
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  list-filters(v-model:search="search" v-model:values="filters" :filters="[]" :loading="loading" placeholder="Найти помещение" @reset="list.reset")
  n-spin(v-if="loading" aria-label="Загрузка помещений")
  template(v-else-if="state")
    p(v-if="state.area") Площадь площадки: занято {{ state.area.used }} из {{ state.area.total }}, доступно {{ state.area.available }}.
    p(v-if="state.can_buy") Доступно в бюджете площадки: {{ formatCredits(state.budget_available ?? '0.0000') }} Cr.
    n-alert(v-if="state.area?.unaccounted_building" type="warning") На площадке есть постройка без учтённой площади. Покупка временно недоступна.
    p(v-if="state.area && !state.can_buy") Покупка станет доступна после включения хранения и экономики мира.
    p(v-if="!state.area") Для покупки откройте свою стартовую площадку.
    p(v-if="!state.items.length") Предложений по выбранным условиям нет.
    ul.offers
      li(v-for="item in state.items" :key="item.id" :class="{ 'offer-unaffordable': item.can_afford === false }")
        h3 {{ item.name }} · {{ formatCredits(item.price) }} Cr
        n-alert(v-if="item.can_afford === false" type="warning")
          span Бюджета площадки не хватает.
          router-link(:to="{ path: `/world/nodes/${nodeId}`, hash: '#finance' }") Пополнить бюджет
        n-alert(v-if="!item.requirements_status.allowed" type="info")
          p Требования пока не выполнены:
          ul
            li(v-for="(reason, index) in item.requirements_status.reasons" :key="`${reason.code}-${index}`") {{ reason.message }}
        p Площадь: {{ item.area }}. Мест для станций или сундуков: {{ item.slots }}.
        template(v-if="item.delivery === 'construction'")
          p Срок строительства: {{ Math.ceil(item.duration_seconds / 60) }} мин. Материалы резервируются из доступных ячеек рюкзака:
          ul
            li(v-for="material in item.materials" :key="material.item_id") {{ material.name }}: {{ material.quantity }}
        p(v-if="item.lodging_places") Постоянная койка: 1. После покупки отдельно назначьте ночлег в комнате дома.
        template(v-if="item.repair")
          p Договор ремонта: полный ремонт — {{ formatCredits(item.repair.full_price) }} Cr из бюджета здания. Цена и материалы пропорциональны повреждению с округлением вверх.
          p(v-if="item.repair_for_existing") Владельцы прежних зданий этого типа и площади без договора могут принять его на странице своей постройки.
          ul
            li(v-for="material in item.repair.materials" :key="material.item_id") {{ material.name }}: {{ material.quantity }} при полном повреждении
        p(v-else) Договор ремонта в покупку не включён.
        p(v-if="item.expansion_limit > item.slots") Можно открыть до {{ item.expansion_limit }} мест. Первое дополнительное место — {{ formatCredits(item.expansion_base_price) }} Cr, стоимость каждого следующего растёт на 20%.
        p {{ item.exposure_class === 'covered' ? 'Под навесом износ от времени ниже, чем на улице.' : 'Внутри нет износа от времени; износ при работе сохраняется.' }}
        n-button(v-if="state.area" :disabled="locked || calculating || !state.can_buy || !item.requirements_status.allowed || state.area.available < item.area" @click="preview('buy', item.id)") {{ item.delivery === 'construction' ? 'Рассчитать стройку' : 'Рассчитать покупку' }}
        n-button(v-if="state.can_publish" :disabled="locked || calculating" @click="preview('withdraw', item.id)") Снять предложение
    page-pager(v-model:page="page" query-prefix="premises" :result="state" :disabled="busy")
    details(v-if="state.can_publish")
      summary Опубликовать предложение
      p Опубликуйте стоимость готового помещения. Оплата покупок поступает в казну этого поселения; действующие покупки не меняются при снятии предложения.
      label Название
        n-input(v-model:value="form.name" :maxlength="120" :disabled="locked")
      label Тип
        n-select(v-model:value="form.kind" :options="kinds" :disabled="locked")
      label Площадь (1–4)
        n-input-number(v-model:value="form.area" :min="1" :max="4" :precision="0" :disabled="locked")
      p(v-if="form.kind === 'house'") Дом включает одну койку и хотя бы одно место оборудования. Минимальная площадь — 2; одна единица площади отведена для сна.
      label Мест оборудования
        n-input-number(v-model:value="form.slots" :min="1" :max="equipmentArea" :precision="0" :disabled="locked")
      label Предел мест после расширения (необязательно)
        n-input-number(v-model:value="form.expansion_limit" :min="form.slots || 1" :max="equipmentArea" :precision="0" :disabled="locked" placeholder="Без расширения")
      label Базовая цена дополнительного места, Cr
        n-input(v-model:value="form.expansion_base_price" inputmode="decimal" :maxlength="20" :disabled="locked" placeholder="Только для расширяемого помещения")
      label Полная цена, Cr
        n-input(v-model:value="form.price" inputmode="decimal" :maxlength="20" :disabled="locked")
      p Условия ремонта можно включить при публикации через админку мира.
      n-button(:disabled="locked" :loading="calculating" @click="preview('publish')") Рассчитать предложение
    section(v-if="quote" aria-live="polite")
      h3 {{ quote.action === 'withdraw' ? 'Снять предложение' : quote.action === 'buy' ? 'Подтвердить покупку' : 'Подтвердить публикацию' }}: {{ quote.name }}
      template(v-if="quote.room?.repair")
        p Договор полного ремонта: {{ formatCredits(quote.room.repair.full_price) }} Cr из бюджета здания в казну поселения. Расход пропорционален повреждению с округлением вверх.
        ul
          li(v-for="material in quote.room.repair.materials" :key="material.item_id") {{ material.name }}: {{ material.quantity }}
      p(v-else-if="quote.room") Договор ремонта не включён.
      template(v-if="quote.room")
        p Стоимость: {{ formatCredits(quote.room.price) }} Cr; площадь {{ quote.room.area }}; мест {{ quote.room.slots }}.
        p(v-if="quote.room.delivery === 'ready'") Готово к размещению оборудования сразу после оплаты.
        template(v-else)
          p Срок строительства: {{ Math.ceil(quote.room.duration_seconds / 60) }} мин. Cr резервируются в бюджете до завершения. Материалы из рюкзака будут храниться отдельно:
          ul
            li(v-for="material in quote.room.materials" :key="material.item_id") {{ material.name }}: {{ material.quantity }}
          p Стройку можно поставить на паузу. Отмена до фактического завершения освобождает весь резерв Cr и возвращает материалы в рюкзак. Для отмены нужно место под весь возврат. После завершения доступно готовое помещение.
        p(v-if="quote.room.expansion_limit > quote.room.slots") Последующее расширение до {{ quote.room.expansion_limit }} мест из бюджета комнаты. Базовая цена: {{ formatCredits(quote.room.expansion_base_price) }} Cr; стоимость каждого следующего места растёт на 20%. Условия сохраняются после покупки.
        p {{ quote.room.exposure_class === 'covered' ? 'Защита: навес.' : 'Защита: помещение.' }} {{ quote.room.lodging_places ? 'Включена одна койка. Ночлег назначается отдельно.' : 'Мест ночлега нет.' }}
      template(v-if="quote.payment")
        p Источник — бюджет этой площадки. Получатель — казна поселения «{{ quote.payment.recipient_name }}». Личные Cr: 0.
        p(v-if="quote.room?.delivery === 'ready'") Покупка постоянная. Возврат, снос и перенос постройки пока недоступны.
      p(v-if="quote.action === 'withdraw'") Новые покупки по этому предложению прекратятся. Купленные помещения сохранятся.
      n-button(type="primary" :disabled="locked" @click="confirm") {{ quote.action === 'buy' ? (quote.room?.delivery === 'construction' ? 'Зарезервировать Cr и материалы, начать стройку' : 'Оплатить из бюджета и получить помещение') : quote.action === 'withdraw' ? 'Подтвердить снятие' : 'Опубликовать' }}
</template>
<style scoped>
.world-premises { display: grid; gap: .75rem; }
.offers { list-style: none; padding: 0; display: grid; gap: .75rem; }
.offers li, details { border: 1px solid var(--border); border-radius: .4rem; padding: 1rem; }
.offers li.offer-unaffordable { border-color: var(--color-danger, #c0392b); }
label { display: grid; gap: .3rem; margin-block: .75rem; max-width: 36rem; }
summary { cursor: pointer; }
</style>

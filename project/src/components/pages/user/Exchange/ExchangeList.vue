<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NCard, NPopconfirm, NTag } from 'naive-ui';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import RequestState from '@/components/RequestState.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { usePageRequest } from '@/hooks/usePageRequest';
import { date, emptyPage, errorText, field, list, mutate, person, type Page } from '@/services/api/portal';
import { affordableOrder, exchangeDirection, exchangeOrder, type ExchangeOrder } from '@/services/api/exchangeOrders';

const props = defineProps<{ mode: 'available' | 'my' | 'history' }>();
const store = useStore();
const route = useRoute();
const mode = computed(() => props.mode);
const session = computed(() => store.state.auth.revision);
const userId = computed(() => Number(store.getters['auth/user']?.id));
const account = computed(() => person(store.getters['auth/user']));
const title = computed(() => mode.value === 'my' ? 'Мои заявки' : mode.value === 'history' ? 'История сделок' : 'Доступные заявки');
const { page, search, filters, params, reset } = useListQuery({ type: '' });
const filterDefinitions = [{ key: 'type', label: 'Тип заявки', options: [
  { label: 'Автор продаёт кредиты', value: 'buy' },
  { label: 'Автор покупает кредиты', value: 'sell' },
] }];
type OrderPage = Omit<Page, 'items'> & { items: ExchangeOrder[] };
const initial: OrderPage = { ...emptyPage(), items: [] };
const { data, loading, error, refresh } = usePageRequest<OrderPage>(async () => {
  const result = await list('exchange' + (mode.value === 'available' ? '' : '/' + mode.value), page.value, params.value);
  return { ...result, items: result.items.map(exchangeOrder) };
}, initial, [mode, page, params, session]);
const busy = ref<number | null>(null);
const actionError = ref('');
const notice = ref('');
let disposed = false;
onBeforeUnmount(() => { disposed = true; });
const canCancel = (order: ExchangeOrder) => order.user_id === userId.value && order.user_client === 0;
const canProceed = (order: ExchangeOrder) => affordableOrder(order, userId.value, account.value);
const label = (order: ExchangeOrder) => {
  const direction = exchangeDirection(order, userId.value);
  return direction === 'buy' ? 'Покупка кредитов' : direction === 'sell' ? 'Продажа кредитов' : 'Обмен кредитов';
};
async function act(order: ExchangeOrder) {
  if (busy.value !== null || mode.value === 'history' || !(mode.value === 'my' ? canCancel(order) : canProceed(order))) return;
  const cancel = mode.value === 'my';
  const revision = session.value;
  const path = route.path;
  const current = () => !disposed && revision === session.value && path === route.path;
  busy.value = order.id; actionError.value = ''; notice.value = '';
  try {
    await mutate('exchange/' + order.id, cancel ? 'delete' : 'put', cancel ? undefined : {});
    if (revision !== session.value) return;
    // Account refresh remains useful even if the user changed tabs during settlement.
    const accountRefresh = store.dispatch('auth/fetchData').catch(() => {
      if (current()) actionError.value = 'Операция выполнена, но счёт не обновился. Обновите профиль перед следующей сделкой.';
    });
    if (current()) {
      notice.value = cancel ? 'Заявка отменена. Зарезервированные средства возвращены.' : 'Сделка выполнена.';
      await refresh();
    }
    await accountRefresh;
  } catch (cause) { if (current()) actionError.value = errorText(cause); }
  finally { busy.value = null; }
}
</script>
<template lang="pug">
.stack
  .toolbar
    strong Доступно: {{ field(account.credit) }} Cr · {{ field(account.balance) }} Кг
    n-button(:loading="loading" :disabled="busy !== null" @click="refresh") Обновить
  n-alert(v-if="actionError" type="error") {{ actionError }}
  n-alert(v-if="notice" type="success") {{ notice }}
  n-card(:title="title")
    .stack
      list-filters(v-model:search="search" v-model:values="filters" :filters="filterDefinitions" :loading="loading" @reset="reset")
      p.muted Поиск по участнику, номеру или сумме заявки.
      p.muted(v-if="mode === 'history'") Показаны суммы заявок. Начисления с учётом комиссии доступны в #[router-link(to="/balance") истории счёта].
      request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
        article.record-row(v-for="order in data.items" :key="order.id")
          .order-info
            .toolbar
              strong №{{ order.id }} · {{ label(order) }}
              n-tag(size="small") {{ order.type === 'buy' ? 'Автор продаёт' : 'Автор покупает' }}
            .order-amounts {{ field(order.credit) }} Cr ↔ {{ field(order.amount) }} Кг
            small.muted(v-if="typeof order.price === 'number' || typeof order.price === 'string'") {{ field(order.price) }} Кг за 1000 Cr
            .muted
              span Автор:&nbsp;
              router-link(v-if="typeof order.username === 'string' && order.username" :to="'/wall/' + encodeURIComponent(order.username)") {{ order.username }}
              span(v-else) №{{ order.user_id }}
              template(v-if="order.user_client > 0")
                |  · Участник:&nbsp;
                router-link(v-if="typeof order.username_client === 'string' && order.username_client" :to="'/wall/' + encodeURIComponent(order.username_client)") {{ order.username_client }}
                span(v-else) №{{ order.user_client }}
            small.muted {{ date(mode === 'history' ? order.updated_at : order.created_at) }}
          .order-action(v-if="mode !== 'history'")
            n-popconfirm(v-if="mode === 'my'" :disabled="busy !== null || !canCancel(order)" @positive-click="act(order)")
              template(#trigger)
                n-button(:loading="busy === order.id" :disabled="busy !== null || !canCancel(order)") Отменить
              | Отменить заявку №{{ order.id }} и вернуть {{ order.type === 'buy' ? order.credit + ' Cr' : order.amount + ' Кг' }}?
            template(v-else)
              n-popconfirm(:disabled="busy !== null || !canProceed(order)" @positive-click="act(order)")
                template(#trigger)
                  n-button(type="primary" :loading="busy === order.id" :disabled="busy !== null || !canProceed(order)") {{ order.type === 'buy' ? 'Купить' : 'Продать' }}
                | {{ order.type === 'buy' ? 'Списать ' + order.amount + ' Кг и получить ' + order.credit + ' Cr?' : 'Списать ' + order.credit + ' Cr и получить ' + order.amount + ' Кг?' }}
              small.muted(v-if="!canProceed(order)") Недостаточно средств или заявка недоступна.
      page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading || busy !== null")
</template>
<style scoped lang="scss">
.order-info { display: grid; gap: .35rem; min-width: 0; }
.order-amounts { font-size: 1.1rem; font-weight: 600; }
.order-action { display: flex; flex-direction: column; gap: .35rem; align-items: flex-start; }
.order-action small { max-width: 16rem; }
@media (min-width: 680px) { .order-action { align-items: flex-end; text-align: right; } }
</style>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { NAlert, NButton, NCard, NForm, NFormItem, NInput, NInputNumber, NPopconfirm, NPopover } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import PagePager from '@/components/PagePager.vue';
import RequestState from '@/components/RequestState.vue';
import ActionButton from '@/components/ActionButton.vue';
import UserAvatar from '@/components/user/UserAvatar.vue';
import { list, emptyPage, mutate, date, field, errorText, person } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
import { useListQuery } from '@/hooks/useListQuery';
const store = useStore();
const userId = computed(() => Number(store.getters['auth/user']?.id));
const sessionRevision = computed(() => store.state.auth.revision);
const balance = computed(() => person(store.getters['auth/user']).credit);
const { page, filters, params } = useListQuery({ mode: 'active' });
const mode = computed(() => filters.value.mode === 'history' ? 'history' : 'active');
const modes = [{ value: 'active', label: 'Новые', icon: 'paper-plane' }, { value: 'history', label: 'Получены', icon: 'check-circle' }];
const quickAmounts = [1, 5, 10, 50, 100, 500, 1000];
const { data, loading, error, refresh } = usePageRequest(() => {
  if (!userId.value) return Promise.resolve(emptyPage());
  const { 'filter[mode]': _mode, q: _search, ...query } = params.value;
  return list(mode.value === 'active' ? 'transfer' : 'transfer/history', page.value, query);
}, emptyPage(), [mode, page, params, sessionRevision]);
const amount = ref<number | null>(null);
const count = ref<number | null>(1);
const creatable = computed(() => amount.value && Number.isSafeInteger(amount.value) && amount.value > 0 && count.value && Number.isSafeInteger(count.value) && count.value > 0 && count.value <= 100 && Number.isFinite(Number(balance.value)) ? Math.max(0, Math.min(count.value, Math.floor(Number(balance.value) / amount.value))) : 0);
const receiveId = ref<number | null>(null);
const receiveCode = ref('');
const busy = ref(false);
const actionError = ref('');
const notice = ref('');
const canCreate = computed(() => creatable.value > 0 && Number(amount.value) <= 1000000000);
async function act(path: string, method: 'post' | 'put' | 'delete', body?: unknown) {
  if (busy.value) return;
  if (method === 'post' && !canCreate.value) return;
  if (method === 'put' && (!receiveId.value || !Number.isSafeInteger(receiveId.value) || receiveId.value < 1 || !receiveCode.value.trim())) return;
  const revision = store.state.auth.revision;
  busy.value = true; actionError.value = ''; notice.value = '';
  try {
    const result = await mutate(path, method, body);
    if (revision !== store.state.auth.revision) return;
    notice.value = 'Операция выполнена.';
    if (method === 'post' && result && typeof result === 'object' && 'created' in result && 'requested' in result) notice.value = `Создано переводов: ${result.created} из ${result.requested}.`;
    amount.value = null; count.value = 1; receiveId.value = null; receiveCode.value = '';
    await refresh();
    try { await store.dispatch('auth/fetchData'); }
    catch { actionError.value = 'Операция выполнена, но счёт не обновился. Обновите профиль перед следующей операцией.'; }
  } catch (cause) { actionError.value = errorText(cause); }
  finally { busy.value = false; }
}
</script>
<template lang="pug">
page-header(page-title="Переводы кредитов")
.container.page.stack
  p Доступно: {{ field(balance) }} Cr
  n-alert(v-if="actionError" type="error") {{ actionError }}
  n-alert(v-if="notice" type="success") {{ notice }}
  .cards
    n-card(title="Создать перевод")
      template(#header-extra)
        n-popover(trigger="click" :width="300")
          template(#trigger)
            n-button(quaternary circle aria-label="Как создать перевод" title="Как создать перевод")
              font-awesome-icon(icon="question-circle" aria-hidden="true")
          p Создайте перевод и передайте получателю номер и хэш из списка «Новые». Кредиты будут зарезервированы. У новых переводов хэш содержит 32 символа.
          p Каждый перевод может получить только один пользователь. После получения вернуть кредиты нельзя. Передавайте номер и хэш только адресату.
          p Рейтинг начисляется отправителю при получении перевода, если его рейтинг выше рейтинга получателя минимум на 50 и он сам не получал переводы за последние 7 дней.
      n-form(@submit.prevent)
        n-form-item(label="Сумма, Cr" :label-props="{ for: 'transfer-amount' }")
          .amount-field
            n-input-number(:input-props="{ id: 'transfer-amount' }" v-model:value="amount" :min="1" :precision="0" :disabled="busy" placeholder="Целое количество кредитов")
            .quick-amounts(role="group" aria-label="Быстрая сумма перевода")
              n-button(v-for="value in quickAmounts" :key="value" size="small" :disabled="busy || (amount || 0) + value > Math.min(Number(balance), 1000000000)" :aria-label="'Добавить ' + value + ' кредитов'" @click="amount = (amount || 0) + value")
                template(#icon)
                  font-awesome-icon(icon="coins" aria-hidden="true")
                | +{{ value }}
        n-form-item(label="Количество переводов" :label-props="{ for: 'transfer-count' }")
          n-input-number(:input-props="{ id: 'transfer-count' }" v-model:value="count" :min="1" :max="100" :precision="0" :disabled="busy")
        p Будет создано: {{ creatable }} · Всего: {{ creatable * (amount || 0) }} Cr
        p.muted(v-if="creatable < (count || 0)") Количество уменьшено до доступного баланса.
        n-popconfirm(@positive-click="act('transfer', 'post', { amount, count })" :positive-button-props="{ disabled: busy || !canCreate }")
          template(#trigger)
            action-button(icon="paper-plane" :label="creatable > 1 ? 'Создать переводы' : 'Создать перевод'" type="primary" :loading="busy" :disabled="!canCreate")
          | Создать до {{ count }} переводов по {{ amount }} Cr? Если баланс изменится, сервер создаст доступное количество.
    n-card(title="Получить перевод")
      template(#header-extra)
        n-popover(trigger="click" :width="300")
          template(#trigger)
            n-button(quaternary circle aria-label="Как получить перевод" title="Как получить перевод")
              font-awesome-icon(icon="question-circle" aria-hidden="true")
          p Введите номер и хэш перевода, полученные от отправителя. Нужны оба значения. Для старых переводов используйте прежний хэш без изменений.
      n-form(@submit.prevent)
        n-form-item(label="Номер перевода" :label-props="{ for: 'transfer-id' }")
          n-input-number(:input-props="{ id: 'transfer-id' }" v-model:value="receiveId" :min="1" :precision="0" :disabled="busy" placeholder="Номер")
        n-form-item(label="Хэш получения" :label-props="{ for: 'transfer-code' }")
          n-input(:input-props="{ id: 'transfer-code', autocomplete: 'off', spellcheck: false }" v-model:value="receiveCode" :maxlength="60" :disabled="busy" placeholder="Хэш от отправителя")
        n-popconfirm(@positive-click="act('transfer/' + receiveId, 'put', { password: receiveCode.trim() })" :positive-button-props="{ disabled: busy }")
          template(#trigger)
            action-button(icon="arrow-down" label="Получить" :disabled="!receiveId || !receiveCode.trim() || busy")
          | Получить перевод №{{ receiveId }}?
  n-card(title="Мои переводы")
    .transfer-modes(role="group" aria-label="Список переводов")
      action-button(v-for="option in modes" :key="option.value" :icon="option.icon" :label="option.label" :aria-pressed="mode === option.value" :type="mode === option.value ? 'primary' : 'default'" @click="filters = { mode: option.value }")
    request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
      .record-row(v-for="entry in data.items" :key="entry.id")
        div
          strong Перевод №{{ entry.id }}
          .muted {{ date(entry.created_at) }}
          p(v-if="entry.amount !== undefined") {{ field(entry.amount) }} Cr
          p.muted(v-else) Сумма не передана сервером
          .transfer-recipient(v-if="mode === 'history'")
            span.muted Получатель
            user-avatar(v-if="entry.recipient" :user="entry.recipient")
            router-link(v-else-if="entry.username_buyer" :to="'/wall/' + encodeURIComponent(String(entry.username_buyer))") {{ entry.username_buyer }}
            span(v-else) —
            .muted Получен: {{ date(entry.received_at || entry.updated_at) }}
          p(v-if="mode === 'active' && Number(entry.user_id) === userId && Number(entry.user_buyer) === 0 && typeof entry.password === 'string' && entry.password.trim()")
            span.muted Хэш получения:
            code.transfer-code {{ entry.password.trim() }}
        n-popconfirm(v-if="mode === 'active'" @positive-click="act('transfer/' + entry.id, 'delete')")
          template(#trigger)
            action-button(icon="times" label="Отменить" :disabled="busy")
          | Отменить перевод №{{ entry.id }} и вернуть кредиты?
    page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading || busy")
</template>

<style scoped>
.amount-field { width: 100%; }
.quick-amounts, .transfer-modes { display: flex; flex-wrap: wrap; gap: .5rem; }
.quick-amounts { margin-top: .5rem; }
.transfer-modes { margin-bottom: 1rem; }
.transfer-recipient { display: grid; gap: .35rem; margin-top: .5rem; }
.transfer-code {
  margin-left: 0.35em;
  overflow-wrap: anywhere;
  user-select: all;
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { NAlert, NButton, NCard, NForm, NFormItem, NInput, NInputNumber, NPopconfirm } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import PagePager from '@/components/PagePager.vue';
import RequestState from '@/components/RequestState.vue';
import ListFilters from '@/components/ListFilters.vue';
import { list, emptyPage, mutate, date, field, errorText, person } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
import { useListQuery } from '@/hooks/useListQuery';
const store = useStore();
const userId = computed(() => Number(store.getters['auth/user']?.id));
const sessionRevision = computed(() => store.state.auth.revision);
const balance = computed(() => person(store.getters['auth/user']).credit);
const { page, search, filters, params, reset } = useListQuery({ mode: 'active' });
const mode = computed(() => filters.value.mode === 'history' ? 'history' : 'active');
const definitions = [{ key: 'mode', label: 'Список переводов', options: [{ label: 'Не получены', value: 'active' }, { label: 'История', value: 'history' }] }];
const { data, loading, error, refresh } = usePageRequest(() => {
  if (!userId.value) return Promise.resolve(emptyPage());
  const { 'filter[mode]': _mode, ...query } = params.value;
  return list(mode.value === 'active' ? 'transfer' : 'transfer/history', page.value, query);
}, emptyPage(), [mode, page, params, sessionRevision]);
const amount = ref<number | null>(null);
const receiveId = ref<number | null>(null);
const receiveCode = ref('');
const busy = ref(false);
const actionError = ref('');
const notice = ref('');
const canCreate = computed(() => amount.value !== null && Number.isSafeInteger(amount.value) && amount.value > 0 && Number.isFinite(Number(balance.value)) && Number(balance.value) >= amount.value);
async function act(path: string, method: 'post' | 'put' | 'delete', body?: unknown) {
  if (busy.value) return;
  if (method === 'post' && !canCreate.value) return;
  if (method === 'put' && (!receiveId.value || !Number.isSafeInteger(receiveId.value) || receiveId.value < 1 || !receiveCode.value.trim())) return;
  const revision = store.state.auth.revision;
  busy.value = true; actionError.value = ''; notice.value = '';
  try {
    await mutate(path, method, body);
    if (revision !== store.state.auth.revision) return;
    notice.value = 'Операция выполнена.';
    amount.value = null; receiveId.value = null; receiveCode.value = '';
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
      p.muted Создайте перевод и передайте получателю номер и хэш из списка «Не получены». Кредиты будут зарезервированы. У новых переводов хэш содержит 32 символа.
      n-form(@submit.prevent)
        n-form-item(label="Сумма, Cr" :label-props="{ for: 'transfer-amount' }")
          n-input-number(:input-props="{ id: 'transfer-amount' }" v-model:value="amount" :min="1" :precision="0" :disabled="busy" placeholder="Целое количество кредитов")
        n-popconfirm(@positive-click="act('transfer', 'post', { amount, count: 1 })" :positive-button-props="{ disabled: busy }")
          template(#trigger)
            n-button(type="primary" :loading="busy" :disabled="!canCreate") Создать перевод
          | Зарезервировать {{ amount }} Cr для перевода?
    n-card(title="Получить перевод")
      p.muted Введите номер и хэш перевода, полученные от отправителя. Нужны оба значения. Для старых переводов используйте прежний хэш без изменений.
      n-form(@submit.prevent)
        n-form-item(label="Номер перевода" :label-props="{ for: 'transfer-id' }")
          n-input-number(:input-props="{ id: 'transfer-id' }" v-model:value="receiveId" :min="1" :precision="0" :disabled="busy" placeholder="Номер")
        n-form-item(label="Хэш получения" :label-props="{ for: 'transfer-code' }")
          n-input(:input-props="{ id: 'transfer-code', autocomplete: 'off', spellcheck: false }" v-model:value="receiveCode" :maxlength="60" :disabled="busy" placeholder="Хэш от отправителя")
        n-popconfirm(@positive-click="act('transfer/' + receiveId, 'put', { password: receiveCode.trim() })" :positive-button-props="{ disabled: busy }")
          template(#trigger)
            n-button(:disabled="!receiveId || !receiveCode.trim() || busy") Получить
          | Получить перевод №{{ receiveId }}?
  n-card(title="Мои переводы")
    list-filters(v-model:search="search" v-model:values="filters" :filters="definitions" :loading="loading || busy" @reset="reset")
    request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
      .record-row(v-for="entry in data.items" :key="entry.id")
        div
          strong Перевод №{{ entry.id }}
          .muted {{ date(entry.created_at) }}
          p(v-if="entry.amount !== undefined") {{ field(entry.amount) }} Cr
          p.muted(v-else) Сумма не передана сервером
          p(v-if="mode === 'active' && Number(entry.user_id) === userId && Number(entry.user_buyer) === 0 && typeof entry.password === 'string' && entry.password.trim()")
            span.muted Хэш получения:
            code.transfer-code {{ entry.password.trim() }}
        n-popconfirm(v-if="mode === 'active'" @positive-click="act('transfer/' + entry.id, 'delete')")
          template(#trigger)
            n-button(:disabled="busy") Отменить
          | Отменить перевод №{{ entry.id }} и вернуть кредиты?
    page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading || busy")
</template>

<style scoped>
.transfer-code {
  margin-left: 0.35em;
  overflow-wrap: anywhere;
  user-select: all;
}
</style>

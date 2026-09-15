<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NCard } from 'naive-ui';
import UserAvatar from '@/components/user/UserAvatar.vue';
import UserList from '@/components/user/UserList.vue';
import FormattedNumber from '@/components/FormattedNumber.vue';
import RequestState from '@/components/RequestState.vue';
import ListFilters from '@/components/ListFilters.vue';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { usePageRequest } from '@/hooks/usePageRequest';
import { list, emptyPage, type RecordData } from '@/services/api/portal';
import { bonusRecipients } from '@/services/api/homeActivity';
const props = defineProps<{ kind: 'visitors' | 'bonuses' }>();
const { page, search, params, reset } = useListQuery({}, { prefix: props.kind });
const kind = computed(() => props.kind);
const { data, loading, error, refresh } = usePageRequest(() => props.kind === 'visitors'
  ? list('users/visited', page.value, { ...params.value, 'per-page': 10 })
  : bonusRecipients(page.value, { ...params.value, 'per-page': 10 }), emptyPage(), [kind, page, params]);
const title = computed(() => props.kind === 'visitors' ? 'Посетили сегодня' : 'Получили бонус сегодня');
function recipient(item: RecordData) { return item.user as RecordData; }
</script>
<template lang="pug">
n-card(:title="title")
  template(#header-extra)
    n-button(quaternary :loading="loading" @click="refresh") Обновить
  p.muted По московскому времени
  list-filters(v-model:search="search" :loading="loading" placeholder="Имя пользователя" @reset="reset")
  request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
    user-list(v-if="kind === 'visitors'" :users="data.items" :show-joined="false")
    ul.bonus-list(v-else)
      li.record-row(v-for="item in data.items" :key="item.id")
        user-avatar(:user="recipient(item)")
        strong.bonus-amount
          | +
          formatted-number(:value="item.amount")
          |  Cr
  page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading" :query-prefix="kind")
</template>
<style scoped>
.bonus-list { list-style: none; margin: 0; padding: 0; }
.bonus-amount { color: var(--primary); white-space: nowrap; }
:deep(.n-card-header) { flex-wrap: wrap; gap: .25rem; }
</style>

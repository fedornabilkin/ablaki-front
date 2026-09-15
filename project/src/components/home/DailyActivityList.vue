<script setup lang="ts">
import { computed } from 'vue';
import { NCard } from 'naive-ui';
import { useStore } from 'vuex';
import UserAvatar from '@/components/user/UserAvatar.vue';
import FormattedNumber from '@/components/FormattedNumber.vue';
import RequestState from '@/components/RequestState.vue';
import PagePager from '@/components/PagePager.vue';
import { useListQuery } from '@/hooks/useListQuery';
import { usePageRequest } from '@/hooks/usePageRequest';
import { list, emptyPage, person, type RecordData } from '@/services/api/portal';
import { bonusRecipients } from '@/services/api/homeActivity';
const props = defineProps<{ kind: 'visitors' | 'bonuses' }>();
const { page } = useListQuery({}, { prefix: props.kind });
const store = useStore();
const myId = computed(() => Number(store.getters['auth/user']?.id) || 0);
const kind = computed(() => props.kind);
const { data, loading, error, refresh } = usePageRequest(() => props.kind === 'visitors'
  ? list('users/visited', page.value, { 'per-page': 10 })
  : bonusRecipients(page.value, { 'per-page': 10 }), emptyPage(), [kind, page]);
const title = computed(() => props.kind === 'visitors' ? 'Посетили сегодня' : 'Получили бонус сегодня');
function recipient(item: RecordData) { return props.kind === 'visitors' ? item : item.user as RecordData; }
function isMe(item: RecordData) { return myId.value > 0 && Number(recipient(item).id) === myId.value; }
function isReferral(item: RecordData) { return myId.value > 0 && Number(person(recipient(item)).refovod) === myId.value; }
</script>
<template lang="pug">
n-card(:title="title")
  p.muted По московскому времени
  request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
    ul.bonus-list
      li.record-row(v-for="item in data.items" :key="item.id" :class="{ 'my-entry': isMe(item) }")
        user-avatar(:user="recipient(item)")
        span.referral-mark(v-if="isReferral(item)" title="Ваш реферал") Ваш реферал
        strong.bonus-amount(v-if="kind === 'bonuses'")
          | +
          formatted-number(:value="item.amount")
          |  Cr
  page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading" :query-prefix="kind")
</template>
<style scoped>
.bonus-list { list-style: none; margin: 0; padding: 0; }
.bonus-amount { color: var(--primary); white-space: nowrap; }
.bonus-list :deep(.user-login) { font-weight: 400; }
.my-entry :deep(.user-login) { font-weight: 800; }
.referral-mark { color: var(--primary); font-size: .75rem; }
:deep(.n-card-header) { flex-wrap: wrap; gap: .25rem; }
</style>

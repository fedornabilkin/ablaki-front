<script setup lang="ts">
import { computed, ref, watch, onScopeDispose } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NCard, NForm, NFormItem, NInput, NModal, NPopconfirm } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import RequestState from '@/components/RequestState.vue';
import PagePager from '@/components/PagePager.vue';
import ListFilters from '@/components/ListFilters.vue';
import GiftList from './GiftList.vue';
import { list, detail, emptyPage, field, date, mutate, errorText, type RecordData } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
import { useListQuery } from '@/hooks/useListQuery';
import { giveCommentCredit } from '@/services/api/community';
const route = useRoute();
const router = useRouter();
const store = useStore();
const id = computed(() => String(route.params.theme_id));
const { page, search, filters, params, reset } = useListQuery();
const comment = ref('');
const saving = ref(false);
const saveError = ref('');
const authenticated = computed(() => store.getters['auth/isAuthenticated']);
const userId = computed(() => Number(store.getters['auth/user']?.id));
const giving = ref<number | null>(null);
const giftError = ref('');
const giftNotice = ref('');
let disposed = false;
onScopeDispose(() => { disposed = true; });
watch(id, () => { comment.value = ''; saveError.value = ''; giftError.value = ''; giftNotice.value = ''; });
const theme = usePageRequest(() => detail('forum-theme/' + encodeURIComponent(id.value)), null as RecordData | null, [id]);
const comments = usePageRequest(() => list('forum-comment', page.value, { ...params.value, 'filter[theme_id]': id.value, expand: 'user' }), emptyPage(), [id, page, params]);
const selectedGiftId = computed(() => {
  const raw = route.query.gift;
  return typeof raw === 'string' && /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : null;
});
const showGifts = computed({ get: () => selectedGiftId.value !== null, set: value => { if (!value) void openGifts(null); } });
async function openGifts(commentId: number | null) {
  const query = { ...route.query };
  for (const key of Object.keys(query)) if (key.startsWith('gifts_')) delete query[key];
  if (commentId === null) delete query.gift;
  else query.gift = String(commentId);
  await router.replace({ query });
}
function giftCount(item: RecordData): number {
  return Number.isSafeInteger(Number(item.gift_count)) && Number(item.gift_count) >= 0 ? Number(item.gift_count) : 0;
}
async function give(item: RecordData) {
  if (giving.value !== null || !authenticated.value || Number(item.user_id) === userId.value || item.gifted_by_me === true) return;
  const themeId = id.value;
  const revision = store.state.auth.revision;
  giving.value = item.id; giftError.value = ''; giftNotice.value = '';
  try {
    const result = await giveCommentCredit(item.id);
    if (disposed || themeId !== id.value || revision !== store.state.auth.revision) return;
    comments.data.value = { ...comments.data.value, items: comments.data.value.items.map(entry => entry.id === result.commentId ? { ...entry, gift_count: result.giftCount, gifted_by_me: true } : entry) };
    giftNotice.value = result.alreadyGiven ? 'Вы уже передавали кредит этому сообщению. Повторного списания нет.' : 'Автору сообщения передан 1 Cr.';
    try { await store.dispatch('auth/fetchData'); }
    catch { if (!disposed && themeId === id.value && revision === store.state.auth.revision) giftError.value = 'Кредит передан, но счёт не обновился. Обновите профиль.'; }
  } catch (cause) {
    if (!disposed && themeId === id.value && revision === store.state.auth.revision) giftError.value = errorText(cause);
  } finally { giving.value = null; }
}
function author(item: RecordData) {
  const user = item.user;
  return user && typeof user === 'object' && 'username' in user ? field(user.username) : '';
}
async function submit() {
  if (saving.value || !comment.value.trim()) return;
  const themeId = id.value;
  const revision = store.state.auth.revision;
  saving.value = true;
  saveError.value = '';
  try {
    await mutate('forum-comment', 'post', { theme_id: Number(themeId), comment: comment.value.trim() });
    if (disposed || themeId !== id.value || revision !== store.state.auth.revision) return;
    comment.value = '';
    if (page.value !== 1) page.value = 1;
    else await comments.refresh();
  } catch (cause) { if (!disposed && themeId === id.value && revision === store.state.auth.revision) saveError.value = errorText(cause); }
  finally { saving.value = false; }
}
</script>
<template lang="pug">
page-header(:page-title="theme.data.value ? field(theme.data.value.title) : 'Обсуждение'" :extra-links="[{ link: '/forum', title: '← Все темы' }]")
.container.page.stack
  request-state(:loading="theme.loading.value" :error="theme.error.value" @retry="theme.refresh")
    template(v-if="theme.data.value")
      p.muted Создано {{ date(theme.data.value.created_at) }} · Новые сообщения сверху
      n-card(v-if="authenticated" title="Ваш ответ")
        n-form(@submit.prevent="submit")
          n-form-item(label="Сообщение" :label-props="{ for: 'reply' }")
            n-input(:input-props="{ id: 'reply' }" v-model:value="comment" type="textarea" :maxlength="3000" :autosize="{ minRows: 3, maxRows: 12 }" :disabled="saving" placeholder="Напишите ответ")
          n-alert.mb-3(v-if="saveError" type="error") {{ saveError }}
          n-button(type="primary" attr-type="submit" :loading="saving" :disabled="!comment.trim()") Отправить
      n-alert(v-else type="info")
        router-link(:to="{ path: '/users/login', query: { redirect: route.fullPath } }") Войдите, чтобы ответить
      list-filters(v-model:search="search" v-model:values="filters" :loading="comments.loading.value" @reset="reset")
      n-alert(v-if="giftError" type="error") {{ giftError }}
      n-alert(v-if="giftNotice" type="success") {{ giftNotice }}
      request-state(:loading="comments.loading.value" :error="comments.error.value" :empty="!comments.data.value.items.length" @retry="comments.refresh")
        n-card(v-for="item in comments.data.value.items" :key="item.id")
          .toolbar.mb-3
            router-link(v-if="author(item)" :to="'/wall/' + encodeURIComponent(author(item))") {{ author(item) }}
            span.muted(v-else) Участник №{{ item.user_id }}
            time.muted {{ date(item.created_at) }}
          .pre-wrap {{ field(item.comment) }}
          .toolbar.mt-3
            n-button(secondary @click="openGifts(item.id)") Передали кредит: {{ giftCount(item) }}
            n-button(v-if="item.gifted_by_me === true" disabled) Вы передали 1 Cr
            n-popconfirm(v-else-if="authenticated && Number(item.user_id) !== userId" @positive-click="give(item)" :positive-button-props="{ disabled: giving !== null }")
              template(#trigger)
                n-button(:disabled="giving !== null" :loading="giving === item.id") Передать 1 Cr
              | Передать автору сообщения 1 Cr? Каждому сообщению можно передать кредит один раз.
            router-link(v-else-if="!authenticated" :to="{ path: '/users/login', query: { redirect: route.fullPath } }") Войти и передать 1 Cr
      page-pager(v-if="!comments.error.value" v-model:page="page" :result="comments.data.value" :disabled="comments.loading.value")
n-modal(v-model:show="showGifts" preset="card" :title="'Благодарности сообщению №' + selectedGiftId" :style="{ width: 'min(40rem, calc(100vw - 1.5rem))' }")
  gift-list(v-if="selectedGiftId" :key="selectedGiftId" :comment-id="selectedGiftId")
</template>

<script setup lang="ts">
import { formatCredits } from '@/entities/world/credits';
import { computed, nextTick, ref, watch, onScopeDispose } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NCard, NForm, NButton, NPopconfirm, NSkeleton, NSwitch } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import RequestState from '@/components/RequestState.vue';
import PagePager from '@/components/PagePager.vue';
import MessageComposer from '@/components/MessageComposer.vue';
import ForumPost from './ForumPost.vue';
import { list, detail, emptyPage, field, mutate, errorText, type RecordData } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
import { useListQuery } from '@/hooks/useListQuery';
import { giveCommentCredit } from '@/services/api/community';
import { useForumDraft, forumDraftKey } from '@/hooks/useForumDraft';
const route = useRoute();
const router = useRouter();
const store = useStore();
const id = computed(() => String(route.params.theme_id));
const { page } = useListQuery();
const draft = useForumDraft(computed(() => forumDraftKey(store.getters['auth/user']?.id, 'reply:' + id.value)));
const comment = draft.text;
const saving = ref(false);
const composer = ref<{ focus: () => void } | null>(null);
const saveError = ref('');
const authenticated = computed(() => store.getters['auth/isAuthenticated']);
const userId = computed(() => Number(store.getters['auth/user']?.id));
const giving = ref<number | null>(null);
const giftError = ref('');
const giftNotice = ref('');
let disposed = false;
onScopeDispose(() => { disposed = true; });
watch(id, () => { saveError.value = ''; giftError.value = ''; giftNotice.value = ''; });
const session = computed(() => store.state.auth.revision);
const theme = usePageRequest(() => detail('forum-theme/' + encodeURIComponent(id.value) + '?expand=first_comment'), null as RecordData | null, [id, session]);
const starter = computed(() => theme.data.value?.first_comment as RecordData | null);
const privacyBusy = ref(false), privacyError = ref('');
const ownsTheme = computed(() => authenticated.value && Number(theme.data.value?.user_id) === userId.value);
const canClose = computed(() => ownsTheme.value || theme.data.value?.can_moderate === true);
const deleting = ref(false);
async function setClosed(value: boolean) {
  if (!canClose.value || privacyBusy.value) return;
  const currentId = id.value, account = session.value;
  privacyBusy.value = true; privacyError.value = '';
  try {
    await mutate('forum-theme/' + encodeURIComponent(currentId) + '/close', 'patch', { is_closed: value });
    if (!disposed && currentId === id.value && account === session.value) await theme.refresh();
  } catch (cause) { if (!disposed && currentId === id.value && account === session.value) privacyError.value = errorText(cause); }
  finally { privacyBusy.value = false; }
}
async function deleteTheme() {
  if (deleting.value || theme.data.value?.can_delete !== true) return;
  deleting.value = true; privacyError.value = '';
  try {
    await mutate('forum-theme/' + encodeURIComponent(id.value), 'delete');
    await router.push('/forum');
  } catch (cause) { privacyError.value = errorText(cause); }
  finally { deleting.value = false; }
}
async function setPrivacy(value: boolean) {
  if (!ownsTheme.value || privacyBusy.value) return;
  const currentId = id.value, account = session.value;
  privacyBusy.value = true; privacyError.value = '';
  try {
    await mutate('forum-theme/' + encodeURIComponent(currentId), 'patch', {is_private: Number(value)});
    if (!disposed && currentId === id.value && account === session.value) await theme.refresh();
  } catch (cause) { if (!disposed && currentId === id.value && account === session.value) privacyError.value = errorText(cause); }
  finally { privacyBusy.value = false; }
}
watch([id, session], () => { privacyError.value = ''; });
const comments = usePageRequest(() => list('forum-comment', page.value, { 'filter[theme_id]': id.value, expand: 'user', exclude_starter: 1 }), emptyPage(), [id, page, session]);
watch(id, value => { void mutate('forum-theme/' + encodeURIComponent(value) + '/visit', 'post').catch(() => {}); }, { immediate: true });
function updated(item: RecordData) {
  comments.data.value = { ...comments.data.value, items: comments.data.value.items.map(entry => entry.id === item.id ? item : entry) };
  if (starter.value?.id === item.id && theme.data.value) theme.data.value = { ...theme.data.value, first_comment: item };
}
async function give(item: RecordData, amount: number) {
  if (giving.value !== null || !authenticated.value || Number(item.user_id) === userId.value || item.gifted_by_me === true) return;
  const themeId = id.value;
  const revision = store.state.auth.revision;
  giving.value = item.id; giftError.value = ''; giftNotice.value = '';
  try {
    const result = await giveCommentCredit(item.id, amount);
    if (disposed || themeId !== id.value || revision !== store.state.auth.revision) return;
    comments.data.value = { ...comments.data.value, items: comments.data.value.items.map(entry => entry.id === result.commentId ? { ...entry, gift_count: result.giftCount, gifted_by_me: true } : entry) };
    if (starter.value?.id === result.commentId && theme.data.value) {
      theme.data.value = { ...theme.data.value, first_comment: { ...starter.value, gift_count: result.giftCount, gifted_by_me: true } };
    }
    giftNotice.value = result.alreadyGiven ? 'Вы уже благодарили это сообщение. Повторного списания нет.' : `Автору сообщения передано ${formatCredits(amount)} Cr.`;
    try { await store.dispatch('auth/fetchData'); }
    catch { if (!disposed && themeId === id.value && revision === store.state.auth.revision) giftError.value = 'Кредит передан, но счёт не обновился. Обновите профиль.'; }
  } catch (cause) {
    if (!disposed && themeId === id.value && revision === store.state.auth.revision) giftError.value = errorText(cause);
  } finally { giving.value = null; }
}
async function submit() {
  if (saving.value || !comment.value.trim() || !authenticated.value || !theme.data.value) return;
  const sent = draft.snapshot();
  const themeId = id.value;
  const revision = store.state.auth.revision;
  saving.value = true;
  saveError.value = '';
  let submitted = false;
  try {
    await mutate('forum-comment', 'post', { theme_id: Number(themeId), comment: sent.text.trim() });
    draft.clearSubmitted(sent);
    if (disposed || themeId !== id.value || revision !== store.state.auth.revision) return;
    submitted = true;
    await theme.refresh();
    if (page.value !== 1) page.value = 1;
    else await comments.refresh();
  } catch (cause) {
    if (!disposed && themeId === id.value && revision === store.state.auth.revision) {
      saveError.value = submitted ? 'Ответ опубликован, но список не обновился. Обновите страницу.' : errorText(cause);
    }
  }
  finally {
    saving.value = false;
    if (submitted && !disposed && themeId === id.value && revision === store.state.auth.revision) {
      await nextTick();
      composer.value?.focus();
    }
  }
}
</script>
<template lang="pug">
page-header.forum-header(:page-title="theme.data.value ? field(theme.data.value.title) : 'Обсуждение'")
  template(#actions)
    .privacy-control(v-if="ownsTheme")
      n-switch(:value="theme.data.value?.is_private === true" :disabled="privacyBusy" :loading="privacyBusy" aria-label="Скрыть тему и сообщения от гостей" @update:value="setPrivacy")
      span Только для участников
    small(v-else-if="theme.data.value?.is_private") Только для участников
    .privacy-control(v-if="canClose")
      n-switch(:value="theme.data.value?.is_closed === true" :disabled="privacyBusy" :loading="privacyBusy" aria-label="Закрыть тему для ответов" @update:value="setClosed")
      span Тема закрыта
    small(v-else-if="theme.data.value?.is_closed") Тема закрыта
    n-popconfirm(v-if="theme.data.value?.can_delete === true" @positive-click="deleteTheme")
      template(#trigger)
        n-button(type="error" secondary :loading="deleting") Удалить тему
      | Удалить тему и все сообщения? История переданных кредитов сохранится.
  n-alert(v-if="privacyError" type="error") {{ privacyError }}
  .starting-message(v-if="starter")
    forum-post(:key="starter.id + ':' + session" :item="starter" :giving="giving !== null" @give="give(starter, $event)" @updated="updated")
.container.page.stack
  n-skeleton(v-if="theme.loading.value" text :repeat="2" aria-label="Загрузка темы")
  n-alert(v-if="theme.error.value" type="error")
    | {{ theme.error.value }}
    n-button(text @click="theme.refresh") Повторить
  n-card(v-if="authenticated && theme.data.value && !theme.data.value.is_closed")
    n-form(@submit.prevent="submit")
      message-composer(ref="composer" :key="id + ':' + userId" id="reply" label="Ваш ответ" v-model="comment" :disabled="saving" :submit-disabled="!theme.data.value" placeholder="Напишите ответ" @submit="submit")
      n-alert(v-if="draft.storageError.value" type="warning") {{ draft.storageError.value }}
      n-alert.mb-3(v-if="saveError" type="error") {{ saveError }}
  n-alert(v-else-if="theme.data.value?.is_closed" type="info") Ответы в этой теме закрыты. Благодарить авторов сообщений по-прежнему можно.
  n-alert(v-else-if="['guest', 'error'].includes(store.getters['auth/authStatus'])" type="info")
    router-link(:to="{ path: '/users/login', query: { redirect: route.fullPath } }") Войдите, чтобы ответить
  n-alert(v-if="giftError" type="error") {{ giftError }}
  n-alert(v-if="giftNotice" type="success") {{ giftNotice }}
  request-state(:loading="comments.loading.value" :error="comments.error.value" :empty="!comments.data.value.items.length" @retry="comments.refresh")
    n-card(v-for="item in comments.data.value.items" :key="item.id + ':' + session")
      forum-post(:item="item" :giving="giving !== null" @give="give(item, $event)" @updated="updated")
  page-pager(v-if="!comments.error.value" v-model:page="page" :result="comments.data.value" :disabled="comments.loading.value")
</template>
<style scoped>
.starting-message { margin-top: .25rem; }
.forum-header :deep(.stack) { gap: .5rem; }
.privacy-control { display: flex; align-items: center; gap: .5rem; }
</style>

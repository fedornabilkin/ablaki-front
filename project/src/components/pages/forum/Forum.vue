<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NCard, NForm, NFormItem, NInput, NModal } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import RequestState from '@/components/RequestState.vue';
import PagePager from '@/components/PagePager.vue';
import ListFilters from '@/components/ListFilters.vue';
import MessageComposer from '@/components/MessageComposer.vue';
import CreateButton from '@/components/CreateButton.vue';
import { list, emptyPage, mutate, record, errorText } from '@/services/api/portal';
import ForumThemeList from '@/components/forum/ForumThemeList.vue';
import { usePageRequest } from '@/hooks/usePageRequest';
import { useListQuery } from '@/hooks/useListQuery';
import { useForumDraft, forumDraftKey } from '@/hooks/useForumDraft';
const route = useRoute();
const router = useRouter();
const store = useStore();
const authenticated = computed(() => store.getters['auth/isAuthenticated']);
const mine = computed(() => route.path === '/forum/my');
const { page, search, filters, params, reset } = useListQuery();
const { data, loading, error, refresh } = usePageRequest(() => list(mine.value ? 'forum-theme/my' : 'forum-theme', page.value, { ...params.value, expand: 'user' }), emptyPage(), [mine, page, params]);
const links = computed(() => [{ link: '/forum', title: 'Все темы' }, ...(authenticated.value ? [{ link: '/forum/my', title: 'Мои темы' }] : [])]);
const showCreate = ref(false);
const draftKey = (part: string) => computed(() => forumDraftKey(store.getters['auth/user']?.id, 'new-theme:' + part));
const titleDraft = useForumDraft(draftKey('title'), 250);
const messageDraft = useForumDraft(draftKey('message'));
const pendingTheme = useForumDraft(draftKey('created-id'), 20);
const title = titleDraft.text;
const comment = messageDraft.text;
const saving = ref(false);
const saveError = ref('');
const createdThemeId = computed({ get: () => /^[1-9][0-9]*$/.test(pendingTheme.text.value) && Number.isSafeInteger(Number(pendingTheme.text.value)) ? Number(pendingTheme.text.value) : null, set: (id: number | null) => { pendingTheme.text.value = id ? String(id) : ''; } });
watch(() => store.state.auth.revision, () => { showCreate.value = false; saveError.value = ''; });
async function create() {
  if (saving.value || !title.value.trim() || !comment.value.trim()) return;
  saving.value = true;
  saveError.value = '';
  const revision = store.state.auth.revision;
  const sentTitle = titleDraft.snapshot(), sentMessage = messageDraft.snapshot();
  try {
    if (!createdThemeId.value) {
      const theme = record(await mutate('forum-theme', 'post', { title: title.value.trim(), view: 0 }));
      if (revision !== store.state.auth.revision) return;
      createdThemeId.value = theme.id;
    }
    // The API creates themes and messages separately. Keep the created ID on failure.
    await mutate('forum-comment', 'post', { theme_id: createdThemeId.value, comment: comment.value.trim() });
    titleDraft.clearSubmitted(sentTitle); messageDraft.clearSubmitted(sentMessage);
    if (revision !== store.state.auth.revision) return;
    showCreate.value = false;
    const target = createdThemeId.value;
    createdThemeId.value = null;
    await router.push('/forum/read/' + target);
  } catch (cause) { saveError.value = errorText(cause); }
  finally { saving.value = false; }
}
</script>
<template lang="pug">
page-header(page-title="Форум")
  .toolbar
    create-button(v-if="authenticated" label="Добавить тему" @click="showCreate = true")
    router-link.nav-item(v-else :to="{ path: '/users/login', query: { redirect: route.fullPath } }") Войти для обсуждения
    router-link(v-for="link in links" :key="link.link" :to="link.link" custom v-slot="{ href, navigate, isExactActive }")
      n-button(tag="a" :href="href" :type="isExactActive ? 'primary' : 'default'" @click="navigate") {{ link.title }}
.container.page
  n-card
    list-filters(v-model:search="search" v-model:values="filters" :loading="loading" @reset="reset")
    request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
      forum-theme-list(:themes="data.items")
    page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading")
n-modal(v-model:show="showCreate" preset="card" title="Новая тема" :style="{ width: 'min(35rem, calc(100vw - 2rem))' }" :mask-closable="!saving" :closable="!saving" :close-on-esc="!saving")
  n-form(@submit.prevent="create")
    n-form-item(label="Заголовок" :label-props="{ for: 'theme-title' }")
      n-input(:input-props="{ id: 'theme-title' }" v-model:value="title" :maxlength="250" :disabled="saving || !!createdThemeId" placeholder="О чём хотите поговорить?")
    message-composer(v-if="showCreate" :key="store.state.auth.revision" id="theme-message" v-model="comment" :disabled="saving" :submit-disabled="!title.trim()" submit-label="Опубликовать" placeholder="Начните обсуждение" @submit="create")
    n-alert(v-if="messageDraft.storageError.value || titleDraft.storageError.value" type="warning") {{ messageDraft.storageError.value || titleDraft.storageError.value }}
    n-alert.mb-3(v-if="saveError" type="error") {{ saveError }}
    p(v-if="createdThemeId") Тема уже создана. Повторная отправка добавит только сообщение.
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NCard, NForm, NFormItem, NInput, NModal } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import RequestState from '@/components/RequestState.vue';
import PagePager from '@/components/PagePager.vue';
import { list, emptyPage, field, date, mutate, record, errorText } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
const route = useRoute();
const router = useRouter();
const store = useStore();
const authenticated = computed(() => store.getters['auth/isAuthenticated']);
const mine = computed(() => route.path === '/forum/my');
const page = ref(1);
watch(mine, () => { page.value = 1; });
const { data, loading, error, refresh } = usePageRequest(() => list(mine.value ? 'forum-theme/my' : 'forum-theme', page.value, { sort: '-last_post' }), emptyPage(), [mine, page]);
const links = computed(() => [{ link: '/forum', title: 'Все темы' }, ...(authenticated.value ? [{ link: '/forum/my', title: 'Мои темы' }] : [])]);
const showCreate = ref(false);
const title = ref('');
const comment = ref('');
const saving = ref(false);
const saveError = ref('');
const createdThemeId = ref<number | null>(null);
async function create() {
  if (saving.value || !title.value.trim() || !comment.value.trim()) return;
  saving.value = true;
  saveError.value = '';
  const revision = store.state.auth.revision;
  try {
    if (!createdThemeId.value) {
      const theme = record(await mutate('forum-theme', 'post', { title: title.value.trim(), view: 0 }));
      if (revision !== store.state.auth.revision) return;
      createdThemeId.value = theme.id;
    }
    // The API creates themes and messages separately. Keep the created ID on failure.
    await mutate('forum-comment', 'post', { theme_id: createdThemeId.value, comment: comment.value.trim() });
    if (revision !== store.state.auth.revision) return;
    showCreate.value = false;
    title.value = ''; comment.value = '';
    const target = createdThemeId.value;
    createdThemeId.value = null;
    await router.push('/forum/read/' + target);
  } catch (cause) { saveError.value = errorText(cause); }
  finally { saving.value = false; }
}
</script>
<template lang="pug">
page-header(page-title="Форум" :extra-links="links")
  template(#actions)
    n-button(v-if="authenticated" type="primary" @click="showCreate = true") Создать тему
    router-link.nav-item(v-else :to="{ path: '/users/login', query: { redirect: route.fullPath } }") Войти для обсуждения
.container.page
  n-card
    request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
      .record-row(v-for="theme in data.items" :key="theme.id")
        div
          router-link.record-title(:to="'/forum/read/' + theme.id") {{ field(theme.title) }}
          .muted Последняя активность: {{ date(theme.last_post || theme.created_at) }}
        span.muted {{ field(theme.view) }} просмотров
    page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading")
n-modal(v-model:show="showCreate" preset="card" title="Новая тема" :style="{ width: 'min(560px, calc(100vw - 32px))' }" :mask-closable="!saving" :closable="!saving" :close-on-esc="!saving")
  n-form(@submit.prevent="create")
    n-form-item(label="Заголовок" :label-props="{ for: 'theme-title' }")
      n-input(:input-props="{ id: 'theme-title' }" v-model:value="title" :maxlength="250" :disabled="saving || !!createdThemeId" placeholder="О чём хотите поговорить?")
    n-form-item(label="Первое сообщение" :label-props="{ for: 'theme-message' }")
      n-input(:input-props="{ id: 'theme-message' }" v-model:value="comment" type="textarea" :autosize="{ minRows: 4, maxRows: 12 }" :disabled="saving" placeholder="Начните обсуждение")
    n-alert.mb-3(v-if="saveError" type="error") {{ saveError }}
    p(v-if="createdThemeId") Тема уже создана. Повторная отправка добавит только сообщение.
    n-button(type="primary" attr-type="submit" :loading="saving" :disabled="!title.trim() || !comment.trim()") Опубликовать
</template>

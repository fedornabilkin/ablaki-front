<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NCard, NForm, NFormItem, NInput } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import RequestState from '@/components/RequestState.vue';
import PagePager from '@/components/PagePager.vue';
import { list, detail, emptyPage, field, date, mutate, errorText, type RecordData } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
const route = useRoute();
const store = useStore();
const id = computed(() => String(route.params.theme_id));
const page = ref(1);
const comment = ref('');
const saving = ref(false);
const saveError = ref('');
const authenticated = computed(() => store.getters['auth/isAuthenticated']);
watch(id, () => { page.value = 1; comment.value = ''; saveError.value = ''; });
const theme = usePageRequest(() => detail('forum-theme/' + encodeURIComponent(id.value)), null as RecordData | null, [id]);
const comments = usePageRequest(() => list('forum-comment', page.value, { 'filter[theme_id]': id.value, expand: 'user', sort: '-id' }), emptyPage(), [id, page]);
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
    if (themeId !== id.value || revision !== store.state.auth.revision) return;
    comment.value = '';
    if (page.value !== 1) page.value = 1;
    else await comments.refresh();
  } catch (cause) { if (themeId === id.value) saveError.value = errorText(cause); }
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
            n-input(:input-props="{ id: 'reply' }" v-model:value="comment" type="textarea" :autosize="{ minRows: 3, maxRows: 12 }" :disabled="saving" placeholder="Напишите ответ")
          n-alert.mb-3(v-if="saveError" type="error") {{ saveError }}
          n-button(type="primary" attr-type="submit" :loading="saving" :disabled="!comment.trim()") Отправить
      n-alert(v-else type="info")
        router-link(:to="{ path: '/users/login', query: { redirect: route.fullPath } }") Войдите, чтобы ответить
      request-state(:loading="comments.loading.value" :error="comments.error.value" :empty="!comments.data.value.items.length" @retry="comments.refresh")
        n-card(v-for="item in comments.data.value.items" :key="item.id")
          .toolbar.mb-3
            router-link(v-if="author(item)" :to="'/wall/' + encodeURIComponent(author(item))") {{ author(item) }}
            span.muted(v-else) Участник №{{ item.user_id }}
            time.muted {{ date(item.created_at) }}
          .pre-wrap {{ field(item.comment) }}
      page-pager(v-if="!comments.error.value" v-model:page="page" :result="comments.data.value" :disabled="comments.loading.value")
</template>

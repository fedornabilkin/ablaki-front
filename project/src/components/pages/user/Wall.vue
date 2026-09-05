<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton, NCard, NForm, NFormItem, NInput } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import RequestState from '@/components/RequestState.vue';
import { detail, field, date, person, mutate, errorText, type RecordData } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
const route = useRoute();
const store = useStore();
const login = computed(() => String(route.params.login));
const own = computed(() => store.getters['auth/user']?.username === login.value);
const { data, loading, error, refresh } = usePageRequest(() => detail('users/wall/' + encodeURIComponent(login.value)), null as RecordData | null, [login]);
const description = ref('');
const editing = ref(false);
const saving = ref(false);
const saveError = ref('');
watch(login, () => { editing.value = false; saveError.value = ''; });
function edit() {
  description.value = typeof person(data.value).description === 'string' ? String(person(data.value).description) : '';
  editing.value = true;
}
async function save() {
  if (saving.value) return;
  saving.value = true; saveError.value = '';
  const current = login.value;
  const revision = store.state.auth.revision;
  try {
    await mutate('users/wall', 'patch', { description: description.value.trim() });
    if (current !== login.value || revision !== store.state.auth.revision) return;
    editing.value = false;
    await refresh();
    // Auth owns the account; never update it from a public wall response.
    await store.dispatch('auth/fetchData');
  } catch (cause) { if (current === login.value) saveError.value = errorText(cause); }
  finally { saving.value = false; }
}
</script>
<template lang="pug">
page-header(:page-title="login" :extra-links="[{ link: '/users', title: '← Участники' }]")
.container.page.stack
  request-state(:loading="loading" :error="error" @retry="refresh")
    n-card(v-if="data" title="Об участнике")
      p.muted В сообществе с {{ date(data.created_at) }}
      p Рейтинг: {{ field(person(data).rating) }}
      .pre-wrap(v-if="!editing") {{ person(data).description || 'Участник пока ничего не рассказал о себе.' }}
      n-button.mt-3(v-if="own && !editing" @click="edit") Редактировать описание
      n-form.mt-3(v-if="own && editing" @submit.prevent="save")
        n-form-item(label="О себе" :label-props="{ for: 'description' }")
          n-input(:input-props="{ id: 'description' }" v-model:value="description" type="textarea" :autosize="{ minRows: 4, maxRows: 12 }" :disabled="saving")
        .toolbar
          n-button(type="primary" attr-type="submit" :loading="saving") Сохранить
          n-button(:disabled="saving" @click="editing = false") Отмена
      n-alert.mt-3(v-if="saveError" type="error") {{ saveError }}
</template>

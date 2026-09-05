<script setup>
import { ref, computed } from "vue";
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { getWall, saveWall } from '@/services/api.js';
import { statApi } from '@/services/api/stat.js';
import PageHeader from "@/components/PageHeader.vue";
import {UserBuilder} from "@/entities/user/builder.js";
import {NSpin, NCard, NAvatar, NButton, NInput} from 'naive-ui';

const route = useRoute()
const store = useStore()

const user = ref(null)
const isLoading = ref(true)
const stats = ref(null)

// стену может редактировать только её владелец
const isOwner = computed(() => {
  const current = store.getters['auth/user'];
  return !!current && current.username === route.params.login;
});

getWall(route.params.login)
    .then(response => {

      const builder = new UserBuilder()
      builder.createForWall(response)
      user.value = builder.getEntity()
    })
    .finally(() => {
      isLoading.value = false
    })

statApi.user(route.params.login)
    .then(response => {
      stats.value = response
    })
    .catch(() => {
      // статистика недоступна — блок просто не показываем
    })

// ---- редактирование описания ----
const isEditing = ref(false)
const isSaving = ref(false)
const draft = ref('')
const saveError = ref('')

const startEdit = () => {
  draft.value = user.value.person.description ?? ''
  saveError.value = ''
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
}

const saveDescription = async () => {
  isSaving.value = true
  saveError.value = ''
  try {
    const person = await saveWall(draft.value)
    user.value.person.description = person.description ?? ''
    isEditing.value = false
  } catch (e) {
    saveError.value = 'Не удалось сохранить. Попробуй ещё раз.'
  } finally {
    isSaving.value = false
  }
}

// ---- статистика (только чтение) ----
const statRows = computed(() => {
  const s = stats.value
  if (!s) {
    return []
  }
  return [
    { label: 'Орлянка: сыграно', value: s.games.orel.played },
    { label: 'Орлянка: побед', value: s.games.orel.won },
    { label: 'Сапёр: сыграно', value: s.games.saper.played },
    { label: 'Тем на форуме', value: s.forum.themes },
    { label: 'Сообщений на форуме', value: s.forum.comments },
    { label: 'Сделок на бирже', value: s.exchange },
  ]
})

const wallTitle = (user) => {
  return `Стена пользователя ${user.getUserName()}`
}

const extraLinks = [
  // {
  //   link: `/wall/${wall.username}`,
  //   title: 'Стена',
  // },
  // {
  //   link: `/messages/${wall.username}`,
  //   title: 'Сообщение',
  // },
  // {
  //   link: `#`,
  //   title: 'Подписаться',
  // }
]

</script>

<template lang="pug">
  n-spin(:show='isLoading')
    template(v-if='user')
      page-header(:pageTitle='wallTitle(user)' :extraLinks='extraLinks')
      .container.py-4
        .row
          .col-md-4
            n-card(:bordered='false')
              n-avatar.user-avatar(:size='150' :round='false' object-fit='cover' src='https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg')
          .col-md-8
            n-card(v-if="user" :bordered='false')
              .row
                .col Регистрация
                .col-auto {{ user.created_at_format }}
              .row
                .col Последняя активность
                .col-auto {{ user.last_login_at }}
              .row
                .col Рейтинг
                .col-auto {{ user.person.getRating() }}
              .row
                .col Количество бонусов рейтинга
                .col-auto {{ user.person.getBonusRatingCount() }}
              .row.mt-3(v-if="user.person.isRefovod()")
                .col Рефовод
                .col-auto Есть
        .row.mt-3
          .col
            n-card(:bordered='false' title='О себе')
              template(#header-extra)
                n-button(v-if='isOwner && !isEditing' size='small' secondary @click='startEdit') Редактировать
              template(v-if='isEditing')
                n-input(
                  v-model:value='draft'
                  type='textarea'
                  :rows='4'
                  maxlength='2000'
                  show-count
                  placeholder='Расскажи о себе'
                )
                .wall-edit-actions
                  n-button(type='primary' size='small' :loading='isSaving' @click='saveDescription') Сохранить
                  n-button(size='small' quaternary :disabled='isSaving' @click='cancelEdit') Отмена
                .wall-edit-error(v-if='saveError') {{ saveError }}
              template(v-else)
                | {{ user.person.getDescription() }}
        .row.mt-3(v-if='statRows.length')
          .col
            n-card(:bordered='false' title='Статистика')
              .row(v-for='row in statRows' :key='row.label')
                .col {{ row.label }}
                .col-auto {{ row.value }}
</template>

<style lang="scss" scoped>
    .user-avatar {
        width: 100%;min-height: 150px;
    }

    .wall-edit-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.75rem;
    }

    .wall-edit-error {
        margin-top: 0.5rem;
        color: var(--n-color-error, #d03050);
    }
</style>

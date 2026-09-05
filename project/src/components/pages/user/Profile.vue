<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { NAlert, NButton, NCard } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import RequestState from '@/components/RequestState.vue';
import { usePageRequest } from '@/hooks/usePageRequest';
import { field, date, person, claimDaily, errorText } from '@/services/api/portal';
const store = useStore();
const user = computed(() => store.getters['auth/user']);
const account = computed(() => person(user.value));
const { loading, error, refresh } = usePageRequest(() => store.dispatch('auth/fetchData'), null);
const claiming = ref(false);
const rewardNotice = ref('');
const rewardError = ref('');
async function claim(kind: 'bonus' | 'rating') {
  if (claiming.value) return;
  claiming.value = true; rewardNotice.value = ''; rewardError.value = '';
  const revision = store.state.auth.revision;
  try {
    const received = await claimDaily(kind);
    if (revision !== store.state.auth.revision) return;
    rewardNotice.value = received ? 'Ежедневная награда получена.' : 'Эта награда сегодня уже получена.';
    await refresh();
  } catch (cause) { rewardError.value = errorText(cause); }
  finally { claiming.value = false; }
}
</script>
<template lang="pug">
page-header(page-title="Мой профиль")
  template(#actions)
    n-button(:loading="loading" @click="refresh") Обновить
.container.page.stack
  request-state(:loading="loading" :error="error" @retry="refresh")
    template(v-if="user")
      n-card(:title="field(user.username)")
        p.muted Регистрация: {{ date(user.created_at) }}
        p(v-if="user.email") Почта: {{ field(user.email) }}
        .toolbar
          router-link.nav-item(:to="'/wall/' + encodeURIComponent(field(user.username))") Моя стена
          router-link.nav-item(to="/forum/my") Мои темы
          router-link.nav-item(to="/users/logout") Выйти
      .cards
        n-card(title="Баланс")
          .metric {{ field(account.balance) }} Кг
          router-link(to="/balance") История баланса →
        n-card(title="Кредиты")
          .metric {{ field(account.credit) }} Cr
          .toolbar
            router-link(to="/exchange") Биржа →
            router-link(to="/transfer") Переводы →
        n-card(title="Рейтинг")
          .metric {{ field(account.rating) }}
          router-link(to="/rating") История рейтинга →
      n-card(title="Ежедневные награды")
        .toolbar
          n-button(:loading="claiming" @click="claim('bonus')") Получить кредит
          n-button(:disabled="claiming" @click="claim('rating')") Получить рейтинг
        n-alert.mt-3(v-if="rewardNotice" type="info") {{ rewardNotice }}
        n-alert.mt-3(v-if="rewardError" type="error") {{ rewardError }}
</template>
<style scoped>.metric { font-size: 2rem; font-weight: 650; margin-bottom: 1rem; }</style>

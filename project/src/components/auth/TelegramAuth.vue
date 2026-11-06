<script setup lang="ts">
import { onMounted, onScopeDispose, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NCheckbox, NSpin } from 'naive-ui';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faPaperPlane, faCheck, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import AppDialog from '@/components/AppDialog.vue';
import { completeTelegram, telegramConfig, telegramIdentity, type TelegramPurpose } from '@/services/api/telegramAuth';
import { useTelegramApproval } from '@/hooks/useTelegramApproval';

const props = withDefaults(defineProps<{ purpose?: TelegramPurpose; signup?: boolean }>(), { purpose: 'login', signup: false });
const emit = defineEmits<{ linked: [] }>();
const store = useStore();
const router = useRouter();
const route = useRoute();
const enabled = ref(false);
const ready = ref(false);
const show = ref(false);
const allowSignup = ref(props.signup);
const connected = ref(false);
const connectedName = ref<string | null>(null);
const setupError = ref('');
const setupAbort = new AbortController();
const flow = useTelegramApproval(props.purpose,
  (proof, signal) => props.purpose === 'link' ? completeTelegram(proof, signal) : store.dispatch('auth/loginTelegram', { proof, signal }),
  () => {
    show.value = false;
    if (props.purpose === 'link') { connected.value = true; connectedName.value = flow.username.value; emit('linked'); return; }
    const redirect = route.query.redirect;
    void router.replace(typeof redirect === 'string' && /^\/(?![\/\\])/.test(redirect) ? redirect : '/');
  });
const { phase, request, error, username, clock } = flow;
onMounted(async () => {
  try {
    enabled.value = await telegramConfig(setupAbort.signal);
    if (setupAbort.signal.aborted) return;
    if (enabled.value && props.purpose === 'link') {
      const identity = await telegramIdentity(setupAbort.signal);
      if (setupAbort.signal.aborted) return;
      connected.value = identity?.connected === true; connectedName.value = identity?.username ?? null;
    }
    if (enabled.value && !connected.value && flow.restore()) show.value = true;
  } catch { if (!setupAbort.signal.aborted) setupError.value = 'Не удалось проверить доступность Telegram. Обновите страницу.'; }
  finally { ready.value = true; }
});
onScopeDispose(() => setupAbort.abort());
watch(() => store.state.auth.revision, () => {
  if (!['finishing', 'done'].includes(phase.value)) { flow.cancel(); show.value = false; }
});
function close(value: boolean) { if (!value && phase.value !== 'finishing') { flow.cancel(); show.value = false; } }
</script>

<template lang="pug">
.telegram-auth
  .telegram-connected(v-if="connected")
    font-awesome-icon(:icon="faCheck" aria-hidden="true")
    span Telegram подключён{{ connectedName ? `: @${connectedName}` : '' }}
  template(v-else)
    n-button.telegram-entry(:disabled="!enabled" :loading="!ready" size="large" @click="show = true")
      template(#icon)
        font-awesome-icon(:icon="faPaperPlane" aria-hidden="true")
      | {{ purpose === 'link' ? 'Подключить Telegram' : 'Войти через Telegram' }}
    p.telegram-note(v-if="ready && !enabled") {{ setupError || 'Вход через Telegram пока недоступен.' }}
  app-dialog(:show="show" :title="purpose === 'link' ? 'Подключить Telegram' : 'Вход через Telegram'" icon="paper-plane" :closable="phase !== 'finishing'" :mask-closable="phase !== 'finishing'" :close-on-esc="phase !== 'finishing'" @update:show="close")
    .telegram-content
      template(v-if="phase === 'idle'")
        p Подтвердите {{ purpose === 'link' ? 'привязку аккаунта' : 'вход' }} кнопкой в чате с ботом. Сайт продолжит автоматически — переходить по ссылке обратно не нужно.
        template(v-if="purpose === 'login'")
          n-checkbox(v-model:checked="allowSignup") Создать аккаунт, если Telegram ещё не подключён
          p.telegram-note Уже играете здесь? Сначала войдите привычным способом и подключите Telegram в профиле, чтобы сохранить свой прогресс.
        n-button(type="primary" @click="flow.start(allowSignup)") Продолжить
      n-spin(v-else-if="phase === 'starting'" description="Готовим вход…")
      template(v-else-if="['waiting', 'approved', 'finishing'].includes(phase)")
        .telegram-code(v-if="request")
          span Код на сайте и в боте должен совпадать
          strong {{ request.display_code }}
        p(v-if="phase === 'waiting'") Откройте Telegram и нажмите «Подтвердить» в сообщении бота. При первом обращении нажмите «Старт».
        a.telegram-link(v-if="phase === 'waiting' && request" :href="request.telegram_url" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer")
          font-awesome-icon(:icon="faPaperPlane" aria-hidden="true")
          | Перейти в Telegram
          font-awesome-icon(:icon="faArrowUpRightFromSquare" aria-hidden="true")
        p.telegram-note(v-if="phase === 'waiting'" role="status") Ждём подтверждения · {{ clock }}
        template(v-if="phase === 'approved'")
          p {{ purpose === 'link' ? `Подключить ${username ? '@' + username : 'подтверждённый Telegram'} к вашему аккаунту?` : 'Подтверждение получено. Завершите вход.' }}
          n-button(type="primary" @click="flow.complete()") {{ purpose === 'link' ? 'Подключить' : 'Завершить вход' }}
        n-spin(v-if="phase === 'finishing'" description="Завершаем…")
      template(v-else-if="['expired', 'denied', 'cancelled', 'error'].includes(phase)")
        p(role="status") {{ phase === 'expired' ? 'Время подтверждения истекло.' : phase === 'denied' ? 'Вы отклонили вход в Telegram.' : phase === 'cancelled' ? 'Вход отменён.' : 'Не удалось завершить вход.' }}
        n-button(@click="flow.cancel()") Начать заново
      n-alert(v-if="error" type="warning" role="alert") {{ error }}
      p.telegram-note Подтверждайте только свой запрос. Никому не пересылайте ссылку на вход.
</template>

<style scoped>
.telegram-auth { margin-block: 1rem; }
.telegram-entry { max-width: 100%; }
.telegram-content { display: grid; gap: 1rem; min-width: 0; }
.telegram-content p { margin: 0; }
.telegram-content :deep(.n-button) { justify-self: start; }
.telegram-note { color: var(--text-muted, #a5a5a5); font-size: .85rem; line-height: 1.5; }
.telegram-code { display: grid; gap: .5rem; padding: 1rem; background: rgba(255, 128, 0, .08); border: 1px solid rgba(255, 128, 0, .25); border-radius: .65rem; }
.telegram-code strong { font-size: 1.65rem; letter-spacing: .2em; font-variant-numeric: tabular-nums; }
.telegram-link { display: inline-flex; justify-self: start; align-items: center; gap: .6rem; padding: .8rem 1rem; border-radius: .5rem; background: var(--primary, #ff8000); color: #171717; text-decoration: none; font-weight: 600; }
.telegram-link:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
.telegram-connected { display: flex; align-items: center; gap: .5rem; overflow-wrap: anywhere; }
</style>

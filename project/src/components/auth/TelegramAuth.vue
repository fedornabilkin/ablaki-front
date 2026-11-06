<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NCheckbox, NInput, NSpin } from 'naive-ui';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faPaperPlane, faCheck, faArrowUpRightFromSquare, faCircleQuestion, faLinkSlash, faClock } from '@fortawesome/free-solid-svg-icons';
import AppDialog from '@/components/AppDialog.vue';
import AppPopover from '@/components/AppPopover.vue';
import { completeTelegram, telegramConfig, telegramIdentity, unlinkTelegram, type TelegramPurpose } from '@/services/api/telegramAuth';
import { useTelegramApproval } from '@/hooks/useTelegramApproval';

const props = withDefaults(defineProps<{ purpose?: TelegramPurpose; signup?: boolean }>(), { purpose: 'login', signup: false });
const emit = defineEmits<{ linked: []; unlinked: [] }>();
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
const showUnlink = ref(false);
const unlinkPassword = ref('');
const unlinkError = ref('');
const unlinkBusy = ref(false);
const unlinked = ref(false);
const setupAbort = new AbortController();
const instructions = computed(() => [
  'Сравните код на сайте и в сообщении бота. Откройте Telegram и нажмите «Подтвердить». При первом обращении нажмите «Старт».',
  props.purpose === 'link'
    ? 'После подтверждения вернитесь сюда и нажмите «Подключить».'
    : 'После подтверждения сайт войдёт автоматически. Дополнительная ссылка из чата не нужна.',
  ...(props.purpose === 'login' ? ['Уже играете здесь? Войдите паролем и подключите Telegram в профиле, чтобы сохранить прогресс.'] : []),
  'Подтверждайте только свой запрос. Никому не пересылайте ссылку на вход.',
]);
const flow = useTelegramApproval(props.purpose,
  (proof, signal) => props.purpose === 'link' ? completeTelegram(proof, signal) : store.dispatch('auth/loginTelegram', { proof, signal }),
  () => {
    show.value = false;
    if (props.purpose === 'link') { connected.value = true; connectedName.value = flow.username.value; unlinked.value = false; emit('linked'); return; }
    const redirect = route.query.redirect;
    void router.replace(typeof redirect === 'string' && /^\/(?![\/\\])/.test(redirect) ? redirect : '/');
  });
const { phase, request, error, username, clock } = flow;
onMounted(async () => {
  try {
    enabled.value = await telegramConfig(setupAbort.signal);
    if (setupAbort.signal.aborted) return;
    if (props.purpose === 'link') {
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
  showUnlink.value = false; unlinkPassword.value = '';
});
function close(value: boolean) { if (!value && phase.value !== 'finishing') { flow.cancel(); show.value = false; } }
function open() {
  if (!ready.value || !enabled.value || phase.value === 'starting') return;
  show.value = true;
  void flow.start(allowSignup.value);
}
function changeSignup(value: boolean) {
  allowSignup.value = value;
  void flow.start(value);
}
function closeUnlink(value: boolean) {
  if (unlinkBusy.value) return;
  showUnlink.value = value; unlinkPassword.value = ''; unlinkError.value = '';
}
async function unlink() {
  if (unlinkBusy.value || !unlinkPassword.value) return;
  const revision = store.state.auth.revision;
  unlinkBusy.value = true; unlinkError.value = '';
  try {
    await unlinkTelegram(unlinkPassword.value, setupAbort.signal);
    if (setupAbort.signal.aborted || revision !== store.state.auth.revision) return;
    flow.cancel(); connected.value = false; connectedName.value = null;
    showUnlink.value = false; unlinked.value = true; emit('unlinked');
  } catch (cause: any) {
    if (!setupAbort.signal.aborted && revision === store.state.auth.revision) unlinkError.value = cause?.response?.data?.message || 'Не удалось отвязать Telegram. Попробуйте ещё раз.';
  } finally { unlinkPassword.value = ''; unlinkBusy.value = false; }
}
</script>

<template lang="pug">
.telegram-auth
  .telegram-connected(v-if="connected")
    font-awesome-icon(:icon="faCheck" aria-hidden="true")
    span Telegram подключён{{ connectedName ? `: @${connectedName}` : '' }}
    n-button(size="small" @click="closeUnlink(true)")
      template(#icon)
        font-awesome-icon(:icon="faLinkSlash" aria-hidden="true")
      | Отвязать
  template(v-else)
    p.telegram-note(v-if="unlinked" role="status") Telegram отвязан. Вход по паролю сохранён.
    n-button.telegram-entry(:disabled="!enabled || !ready" :loading="!ready" size="large" @click="open")
      template(#icon)
        font-awesome-icon(:icon="faPaperPlane" aria-hidden="true")
      | {{ purpose === 'link' ? 'Подключить Telegram' : 'Войти через Telegram' }}
    p.telegram-note(v-if="ready && !enabled") {{ setupError || 'Вход через Telegram пока недоступен.' }}
  app-dialog(:show="show" :title="purpose === 'link' ? 'Подключить Telegram' : 'Вход через Telegram'" icon="paper-plane" :closable="phase !== 'finishing'" :mask-closable="phase !== 'finishing'" :close-on-esc="phase !== 'finishing'" @update:show="close")
    .telegram-content
      .telegram-layout
        .telegram-actions
          n-spin(v-if="phase === 'starting'" description="Готовим вход…")
          template(v-else-if="['waiting', 'approved', 'finishing'].includes(phase)")
            .telegram-code(v-if="request")
              span Код подтверждения
              strong {{ request.display_code }}
            a.telegram-link(v-if="phase === 'waiting' && request" :href="request.telegram_url" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer")
              font-awesome-icon(:icon="faPaperPlane" aria-hidden="true")
              | Перейти в Telegram
              font-awesome-icon(:icon="faArrowUpRightFromSquare" aria-hidden="true")
            .telegram-timer(v-if="['waiting', 'approved'].includes(phase)" role="status" aria-label="Осталось на подтверждение")
              font-awesome-icon(:icon="faClock" aria-hidden="true")
              span {{ clock }}
            template(v-if="phase === 'approved'")
              p {{ purpose === 'link' ? `Подключить ${username ? '@' + username : 'подтверждённый Telegram'} к вашему аккаунту?` : 'Подтверждение получено. Завершите вход.' }}
              n-button(type="primary" @click="flow.complete()") {{ purpose === 'link' ? 'Подключить' : 'Завершить вход' }}
            n-spin(v-if="phase === 'finishing'" description="Завершаем…")
          template(v-else-if="['expired', 'denied', 'cancelled', 'error'].includes(phase)")
            p(role="status") {{ phase === 'expired' ? 'Время подтверждения истекло.' : phase === 'denied' ? 'Вы отклонили вход в Telegram.' : phase === 'cancelled' ? 'Вход отменён.' : 'Не удалось завершить вход.' }}
            n-button(@click="flow.start(allowSignup)") Начать заново
        .telegram-instructions.telegram-note
          p(v-for="line in instructions" :key="line") {{ line }}
        .telegram-help
          app-popover(trigger="click" placement="bottom-end")
            template(#trigger)
              n-button(quaternary circle aria-label="Как войти через Telegram")
                template(#icon)
                  font-awesome-icon(:icon="faCircleQuestion" aria-hidden="true")
            p(v-for="line in instructions" :key="line") {{ line }}
      n-checkbox(v-if="purpose === 'login'" :checked="allowSignup" :disabled="!['waiting', 'error', 'expired', 'denied', 'cancelled'].includes(phase)" @update:checked="changeSignup") Создать аккаунт, если Telegram ещё не подключён
      n-alert(v-if="error" type="warning" role="alert") {{ error }}
  app-dialog(:show="showUnlink" title="Отвязать Telegram" icon="paper-plane" :closable="!unlinkBusy" :mask-closable="!unlinkBusy" :close-on-esc="!unlinkBusy" @update:show="closeUnlink")
    form.telegram-content(@submit.prevent="unlink")
      p Вход через Telegram будет отключён. Ваш аккаунт и прогресс сохранятся.
      p.telegram-note Подтвердите пароль аккаунта. Если вы входите только через Telegram, сначала настройте вход по паролю.
      n-input(v-model:value="unlinkPassword" type="password" placeholder="Пароль аккаунта" show-password-on="click" :disabled="unlinkBusy" :input-props="{ autocomplete: 'current-password', 'aria-label': 'Пароль аккаунта' }")
      n-alert(v-if="unlinkError" type="error" role="alert") {{ unlinkError }}
      n-button(type="error" attr-type="submit" :loading="unlinkBusy" :disabled="!unlinkPassword || unlinkBusy") Отвязать Telegram
</template>

<style scoped>
.telegram-auth { margin-block: 1rem; }
.telegram-entry { max-width: 100%; }
.telegram-content { display: grid; gap: 1rem; min-width: 0; }
.telegram-content p { margin: 0; }
.telegram-content :deep(.n-button) { justify-self: start; }
.telegram-layout { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .75rem; align-items: start; }
.telegram-actions { display: grid; gap: .85rem; min-width: 0; }
.telegram-instructions { display: none; }
.telegram-instructions p + p { margin-top: .8rem; }
.telegram-timer { display: flex; align-items: center; gap: .5rem; color: var(--text-muted, #a5a5a5); font-variant-numeric: tabular-nums; }
.telegram-note { color: var(--text-muted, #a5a5a5); font-size: .85rem; line-height: 1.5; }
.telegram-code { display: grid; gap: .5rem; padding: 1rem; background: rgba(255, 128, 0, .08); border: 1px solid rgba(255, 128, 0, .25); border-radius: .65rem; }
.telegram-code span { font-size: .85rem; color: var(--text-muted, #a5a5a5); }
.telegram-code strong { font-size: 1.65rem; letter-spacing: .2em; font-variant-numeric: tabular-nums; }
.telegram-link { display: inline-flex; justify-self: start; align-items: center; gap: .5rem; padding: .8rem .7rem; border-radius: .5rem; background: var(--primary, #ff8000); color: #171717; text-decoration: none; font-weight: 600; font-size: .9rem; }
.telegram-link:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
.telegram-connected { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; overflow-wrap: anywhere; }
@media (min-width: 640px) {
  .telegram-layout { grid-template-columns: minmax(13rem, .9fr) minmax(0, 1.1fr); gap: 1.5rem; }
  .telegram-instructions { display: block; }
  .telegram-help { display: none; }
}
</style>

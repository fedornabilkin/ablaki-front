import { computed, onScopeDispose, ref } from 'vue';
import { cancelTelegram, pollTelegram, startTelegram, validTelegramRequest, type TelegramProof, type TelegramPurpose, type TelegramRequest } from '@/services/api/telegramAuth';

type Phase = 'idle' | 'starting' | 'waiting' | 'approved' | 'finishing' | 'done' | 'expired' | 'denied' | 'cancelled' | 'error';
const storageKey = 'telegram-auth.pending';
const errorText = (error: any) => error?.response?.data?.message || error?.message || 'Не удалось связаться с сервером.';

/** Sequential polling; stale responses cannot finish a newer login attempt. */
export function useTelegramApproval(purpose: TelegramPurpose, finish: (proof: TelegramProof, signal: AbortSignal) => Promise<unknown>, done: () => void) {
  const phase = ref<Phase>('idle');
  const request = ref<TelegramRequest | null>(null);
  const error = ref('');
  const username = ref<string | null>(null);
  const seconds = ref(0);
  let generation = 0;
  let abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let ticker: ReturnType<typeof setInterval> | undefined;
  const proof = () => ({ request_id: request.value!.id, browser_secret: request.value!.browser_secret });
  const clock = computed(() => `${Math.floor(seconds.value / 60)}:${String(seconds.value % 60).padStart(2, '0')}`);

  function forget() { try { sessionStorage.removeItem(storageKey); } catch { /* In-memory mode remains available. */ } }
  function halt() { generation++; abort.abort(); abort = new AbortController(); clearTimeout(timer); clearInterval(ticker); }
  function cancel() {
    const previous = request.value ? proof() : null;
    halt(); forget(); request.value = null; phase.value = 'idle'; error.value = '';
    if (previous) void cancelTelegram(previous).catch(() => {});
  }
  function tick() {
    seconds.value = Math.max(0, Math.ceil((request.value?.expires_at ?? 0) - Date.now() / 1000));
    if (!seconds.value && ['waiting', 'approved'].includes(phase.value)) { halt(); phase.value = 'expired'; forget(); }
  }
  function watchRequest() { tick(); if (phase.value !== 'waiting') return; ticker = setInterval(tick, 1000); void poll(generation); }
  async function start(allowSignup: boolean) {
    cancel(); phase.value = 'starting'; const current = generation;
    try {
      const value = await startTelegram(purpose, allowSignup, abort.signal);
      if (current !== generation) { void cancelTelegram({ request_id: value.id, browser_secret: value.browser_secret }).catch(() => {}); return; }
      request.value = value; phase.value = 'waiting';
      try { sessionStorage.setItem(storageKey, JSON.stringify({ purpose, request: value })); } catch { /* Optional reload recovery. */ }
      watchRequest();
    } catch (cause) { if (current === generation) { error.value = errorText(cause); phase.value = 'error'; } }
  }
  async function poll(current: number) {
    if (current !== generation || !request.value || phase.value !== 'waiting') return;
    let delay = 2000;
    try {
      const status = await pollTelegram(proof(), abort.signal);
      if (current !== generation) return;
      error.value = '';
      if (['approved', 'completed'].includes(status.status)) {
        username.value = status.telegram?.username ?? null; phase.value = 'approved';
        if (purpose === 'login' || status.status === 'completed') await complete();
        return;
      }
      if (['denied', 'cancelled', 'expired'].includes(status.status)) {
        phase.value = status.status as Phase; halt(); forget(); return;
      }
    } catch (cause: any) {
      if (current !== generation) return;
      if ([403, 404, 410].includes(cause?.response?.status)) { error.value = errorText(cause); phase.value = 'error'; halt(); forget(); return; }
      error.value = 'Связь прервалась. Продолжим проверку автоматически.'; delay = 5000;
    }
    if (current === generation && phase.value === 'waiting') timer = setTimeout(() => void poll(current), delay);
  }
  async function complete() {
    if (phase.value !== 'approved' || !request.value) return;
    phase.value = 'finishing'; error.value = ''; const current = generation;
    try {
      await finish(proof(), abort.signal);
      if (current !== generation) return;
      halt(); forget(); phase.value = 'done'; done();
    } catch (cause: any) {
      if (current !== generation) return;
      error.value = errorText(cause);
      if (cause?.code === 'AUTH_SUPERSEDED') { halt(); forget(); phase.value = 'cancelled'; return; }
      phase.value = [400, 401, 403, 404, 409, 410].includes(cause?.response?.status) ? 'error' : 'approved';
      if (phase.value === 'error') forget();
    }
  }
  function restore(): boolean {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (saved?.purpose !== purpose || !validTelegramRequest(saved?.request) || saved.request.expires_at <= Date.now() / 1000) return false;
      request.value = saved.request; phase.value = 'waiting'; watchRequest(); return true;
    } catch { return false; }
  }
  // Keep the proof for reload / returning from Telegram, stop every background request and timer.
  onScopeDispose(halt);
  return { phase, request, error, username, clock, start, cancel, complete, restore };
}

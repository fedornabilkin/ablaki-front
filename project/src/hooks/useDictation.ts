import { onScopeDispose, ref } from 'vue';
interface SpeechResult { isFinal: boolean; [index: number]: { transcript: string } }
export interface Recognizer {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
export type RecognizerFactory = new () => Recognizer;
export function useDictation(append: (text: string) => void, Factory?: RecognizerFactory) {
  const browser = typeof window === 'undefined' ? undefined : window as Window & { SpeechRecognition?: RecognizerFactory; webkitSpeechRecognition?: RecognizerFactory };
  const Constructor = Factory ?? browser?.SpeechRecognition ?? browser?.webkitSpeechRecognition;
  const supported = !!Constructor;
  const listening = ref(false);
  const error = ref('');
  let active: Recognizer | null = null;
  function cancel() {
    const previous = active; active = null; listening.value = false;
    if (previous) { previous.onresult = null; previous.onerror = null; previous.onend = null; previous.abort(); }
  }
  function toggle() {
    if (active) { active.stop(); return; }
    if (!Constructor) return;
    error.value = '';
    const recognition = new Constructor();
    active = recognition;
    recognition.lang = 'ru-RU'; recognition.continuous = true; recognition.interimResults = false;
    recognition.onresult = event => {
      if (active !== recognition) return;
      const parts: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) parts.push(event.results[i][0].transcript);
      }
      if (parts.length) append(parts.join(' '));
    };
    recognition.onerror = event => {
      if (active !== recognition) return;
      error.value = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Микрофон недоступен. Разрешите доступ к нему и откройте сайт по HTTPS или на localhost.'
        : event.error === 'no-speech' ? 'Речь не распознана. Попробуйте ещё раз.' : 'Не удалось распознать речь. Можно продолжить ввод с клавиатуры.';
      cancel();
    };
    recognition.onend = () => { if (active === recognition) { active = null; listening.value = false; } };
    try { listening.value = true; recognition.start(); }
    catch { error.value = 'Не удалось включить микрофон.'; cancel(); }
  }
  onScopeDispose(cancel);
  return { supported, listening, error, toggle, cancel };
}

import { ref, watch, type Ref } from 'vue';
export interface DraftSnapshot { key: string; text: string }
export function forumDraftKey(userId: unknown, context: string): string {
  const id = Number(userId);
  return Number.isSafeInteger(id) && id > 0 ? `ablakin:forum-draft:v1:${id}:${context}` : '';
}
export function useForumDraft(key: Readonly<Ref<string>>, maxLength = 3000, storage?: Storage) {
  const text = ref(''), storageError = ref('');
  let currentKey = '', restoring = false;
  const target = () => storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  function read(name: string): string {
    if (!name) return '';
    try {
      const raw = target()?.getItem(name);
      if (!raw) return '';
      const value: unknown = JSON.parse(raw);
      return value && typeof value === 'object' && 'text' in value && typeof value.text === 'string' ? value.text.slice(0, maxLength) : '';
    } catch { return ''; }
  }
  watch(key, value => {
    restoring = true; currentKey = value; text.value = read(value); restoring = false;
  }, { immediate: true, flush: 'sync' });
  watch(text, value => {
    if (restoring || !currentKey) return;
    try {
      const store = target();
      if (!store) return;
      if (value) store.setItem(currentKey, JSON.stringify({ text: value.slice(0, maxLength) }));
      else store.removeItem(currentKey);
      storageError.value = '';
    } catch { storageError.value = 'Браузер не разрешил сохранить черновик. Скопируйте текст перед закрытием страницы.'; }
  }, { flush: 'sync' });
  function snapshot(): DraftSnapshot { return { key: currentKey, text: text.value }; }
  function clearSubmitted(sent: DraftSnapshot) {
    // A late response must not erase another topic, account, or newer draft.
    try { if (sent.key && read(sent.key) === sent.text) target()?.removeItem(sent.key); } catch { /* The editor remains usable. */ }
    if (currentKey === sent.key && text.value === sent.text) text.value = '';
  }
  return { text, storageError, snapshot, clearSubmitted };
}

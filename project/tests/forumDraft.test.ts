import { effectScope, ref } from 'vue';
import { describe, it, expect } from 'vitest';
import { forumDraftKey, useForumDraft } from '../src/hooks/useForumDraft';
function memory() {
  const entries = new Map<string, string>();
  return { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => entries.set(key, value), removeItem: (key: string) => entries.delete(key) } as Storage;
}
describe('durable forum drafts', () => {
  it('persists immediately and restores after editor disposal or reload', () => {
    const storage = memory(), key = ref(forumDraftKey(37, 'reply:67'));
    const firstScope = effectScope(), first = firstScope.run(() => useForumDraft(key, 3000, storage))!;
    first.text.value = 'Текст с\nпереносом и 🍎';
    firstScope.stop();
    const secondScope = effectScope(), restored = secondScope.run(() => useForumDraft(key, 3000, storage))!;
    expect(restored.text.value).toBe('Текст с\nпереносом и 🍎');
    secondScope.stop();
  });
  it('isolates topics, accounts and edit drafts without overwriting on navigation', () => {
    const storage = memory(), key = ref(forumDraftKey(37, 'reply:67')), scope = effectScope();
    const draft = scope.run(() => useForumDraft(key, 3000, storage))!;
    draft.text.value = 'first'; key.value = forumDraftKey(37, 'reply:66');
    expect(draft.text.value).toBe(''); draft.text.value = 'second';
    key.value = forumDraftKey(38, 'reply:67'); expect(draft.text.value).toBe('');
    key.value = forumDraftKey(37, 'reply:67'); expect(draft.text.value).toBe('first');
    key.value = forumDraftKey(37, 'edit:67'); expect(draft.text.value).toBe('');
    scope.stop();
  });
  it('clears only the acknowledged draft and preserves newer text or other topics', () => {
    const storage = memory(), key = ref(forumDraftKey(37, 'reply:67')), scope = effectScope();
    const draft = scope.run(() => useForumDraft(key, 3000, storage))!;
    draft.text.value = 'sent'; const sent = draft.snapshot(); draft.text.value = 'newer';
    draft.clearSubmitted(sent); expect(draft.text.value).toBe('newer');
    const newer = draft.snapshot(); key.value = forumDraftKey(37, 'reply:68'); draft.text.value = 'another topic';
    draft.clearSubmitted(newer); expect(draft.text.value).toBe('another topic');
    key.value = sent.key; expect(draft.text.value).toBe('');
    draft.text.value = 'successful'; draft.clearSubmitted(draft.snapshot());
    expect(storage.getItem(key.value)).toBeNull(); expect(draft.text.value).toBe(''); scope.stop();
  });
  it('keeps text usable when storage is blocked and rejects corrupt stored values', () => {
    const storage = memory(), key = ref('test'), scope = effectScope();
    storage.setItem('test', '{broken');
    const draft = scope.run(() => useForumDraft(key, 3000, storage))!;
    expect(draft.text.value).toBe('');
    storage.setItem = () => { throw new Error('quota'); };
    draft.text.value = 'do not lose this'; expect(draft.text.value).toBe('do not lose this'); expect(draft.storageError.value).not.toBe('');
    expect(forumDraftKey(null, 'reply:67')).toBe(''); scope.stop();
  });
});

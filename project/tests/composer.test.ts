import { describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useDictation, type Recognizer } from '../src/hooks/useDictation';
import { submitShortcut } from '../src/services/submitShortcut';
import { breadcrumbs } from '../src/services/breadcrumbs';

describe('message composer', () => {
  it('submits Ctrl/Cmd+Enter once, preserving plain Enter, IME and repeated events', () => {
    const submit = vi.fn();
    const event = { key: 'Enter', ctrlKey: true, metaKey: false, repeat: false, isComposing: false, preventDefault: vi.fn() };
    submitShortcut(event as unknown as KeyboardEvent, submit);
    expect(submit).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
    for (const override of [{ ctrlKey: false }, { repeat: true }, { isComposing: true }, { key: 'a' }]) {
      submitShortcut({ ...event, ...override } as unknown as KeyboardEvent, submit);
    }
    expect(submit).toHaveBeenCalledOnce();
    submitShortcut({ ...event, ctrlKey: false, metaKey: true } as unknown as KeyboardEvent, submit);
    expect(submit).toHaveBeenCalledTimes(2);
  });
  it('appends final speech together and ignores stale results after cancellation or leaving', () => {
    class Speech implements Recognizer {
      lang = ''; continuous = false; interimResults = false;
      onresult: Recognizer['onresult'] = null; onerror: Recognizer['onerror'] = null; onend: Recognizer['onend'] = null;
      start = vi.fn(); stop = vi.fn(); abort = vi.fn();
      constructor() { instances.push(this); }
    }
    const instances: Speech[] = [];
    const scope = effectScope(); const append = vi.fn();
    const voice = scope.run(() => useDictation(append, Speech))!;
    voice.toggle(); const first = instances[0];
    expect(first.lang).toBe('ru-RU'); expect(voice.listening.value).toBe(true);
    const result = { resultIndex: 0, results: [{ isFinal: false, 0: { transcript: 'черновик' } }, { isFinal: true, 0: { transcript: 'один' } }, { isFinal: true, 0: { transcript: 'два' } }] };
    const stale = first.onresult!; stale(result);
    expect(append).toHaveBeenCalledExactlyOnceWith('один два');
    voice.toggle(); expect(first.stop).toHaveBeenCalledOnce();
    voice.cancel(); stale(result); expect(append).toHaveBeenCalledOnce();
    voice.toggle(); scope.stop(); expect(instances[1].abort).toHaveBeenCalledOnce();
    expect(voice.listening.value).toBe(false);
  });
  it('recovers after a microphone permission error without losing typed text', () => {
    let instance: Recognizer;
    class Speech implements Recognizer {
      lang = ''; continuous = false; interimResults = false;
      onresult: Recognizer['onresult'] = null; onerror: Recognizer['onerror'] = null; onend: Recognizer['onend'] = null;
      start() {} stop() {} abort() {} constructor() { instance = this; }
    }
    const scope = effectScope(); const append = vi.fn();
    const voice = scope.run(() => useDictation(append, Speech))!;
    voice.toggle(); instance!.onerror!({ error: 'not-allowed' });
    expect(voice.listening.value).toBe(false); expect(voice.error.value).toContain('Микрофон'); expect(append).not.toHaveBeenCalled();
    voice.toggle(); expect(voice.listening.value).toBe(true); scope.stop();
  });
});
describe('breadcrumbs', () => {
  it('has real parent links and never exposes a login key', () => {
    expect(breadcrumbs('/games/five/my')).toEqual([{ title: 'Главная', to: '/' }, { title: 'Игры', to: '/games' }, { title: '5 яблок', to: '/games/five' }, { title: 'Мои игры' }]);
    expect(JSON.stringify(breadcrumbs('/users/login-key/secret'))).not.toContain('secret');
    expect(breadcrumbs('/forum/read/65', { theme_id: 65 }).at(-1)).toEqual({ title: 'Тема №65' });
  });
});

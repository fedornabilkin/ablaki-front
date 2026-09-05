import { effectScope, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { usePageRequest } from '../src/hooks/usePageRequest';
describe('page requests', () => {
  it('loads once without reactive dependencies and recovers from failure', async () => {
    const scope = effectScope();
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(['ok']);
    const result = scope.run(() => usePageRequest(load, []))!;
    await vi.waitFor(() => expect(result.loading.value).toBe(false));
    expect(load).toHaveBeenCalledOnce();
    expect(result.error.value).not.toBe('');
    await result.refresh();
    expect(result.data.value).toEqual(['ok']);
    expect(result.error.value).toBe('');
    scope.stop();
  });
  it('clears old theme data and ignores stale replies when the route changes', async () => {
    const scope = effectScope();
    const id = ref(1);
    let oldReply!: (value: string) => void;
    const load = vi.fn().mockImplementationOnce(() => new Promise(resolve => { oldReply = resolve; })).mockResolvedValueOnce('theme 2');
    const result = scope.run(() => usePageRequest(load, '', [id]))!;
    id.value = 2;
    await nextTick();
    await vi.waitFor(() => expect(result.data.value).toBe('theme 2'));
    oldReply('theme 1');
    await nextTick();
    expect(result.data.value).toBe('theme 2');
    scope.stop();
  });
  it('does not update data after leaving a page', async () => {
    const scope = effectScope();
    let reply!: (value: string) => void;
    const result = scope.run(() => usePageRequest(() => new Promise<string>(resolve => { reply = resolve; }), ''))!;
    scope.stop();
    reply('late');
    await nextTick();
    expect(result.data.value).toBe('');
  });
});

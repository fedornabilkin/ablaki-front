import {effectScope} from 'vue';
import {describe, expect, it, vi} from 'vitest';
import {useFetch} from '../src/hooks/useFetch';

describe('useFetch', () => {
    it('finishes loading on a failure and allows a successful retry', async () => {
        const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(['order']);
        const state = useFetch(load, []);
        await vi.waitFor(() => expect(state.isLoading.value).toBe(false));
        expect(state.error.value.message).toBe('offline');
        await state.refetch();
        expect(state.result.value).toEqual(['order']);
        expect(state.error.value).toBeNull();
    });
    it('does not overwrite a new response with an older one', async () => {
        let finishOld!: (value: unknown) => void;
        const load = vi.fn().mockReturnValueOnce(new Promise(resolve => {finishOld = resolve;}))
            .mockResolvedValueOnce(['new']);
        const state = useFetch(load, []);
        await state.refetch();
        finishOld(['old']);
        await Promise.resolve();
        expect(state.result.value).toEqual(['new']);
    });
    it('ignores responses after its owning scope is disposed', async () => {
        let resolve!: (value: unknown) => void;
        const scope = effectScope();
        const state = scope.run(() => useFetch(() => new Promise(yes => {resolve = yes;}), []))!;
        scope.stop();
        resolve(['late']);
        await Promise.resolve();
        expect(state.result.value).toEqual([]);
    });
});

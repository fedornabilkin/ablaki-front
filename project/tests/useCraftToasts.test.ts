import { effectScope, nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCraftToasts } from '../src/hooks/useCraftToasts';
const mocks = vi.hoisted(() => ({success: vi.fn()}));
vi.mock('naive-ui', () => ({useMessage: () => mocks}));

describe('craft notifications', () => {
  beforeEach(() => mocks.success.mockReset());
  it('shows each successful action as a timed toast with the same countdown duration', async () => {
    const destroy = vi.fn(); mocks.success.mockReturnValue({destroy});
    const notice = ref(''), session = ref(1), scope = effectScope();
    scope.run(() => useCraftToasts(notice, session));
    notice.value = 'Предмет создан'; await nextTick();
    expect(mocks.success).toHaveBeenCalledTimes(1);
    const [render, options] = mocks.success.mock.calls[0];
    expect(options).toMatchObject({duration: 5000, keepAliveOnHover: false, closable: true});
    expect(render().props).toMatchObject({text: 'Предмет создан', duration: 5000});
    expect(notice.value).toBe('');
    notice.value = 'Предмет создан'; await nextTick();
    expect(mocks.success).toHaveBeenCalledTimes(2);
    scope.stop(); expect(destroy).toHaveBeenCalled();
  });
  it('removes outstanding toasts on account change and leaves completed ones alone', async () => {
    const first = {destroy: vi.fn()}, second = {destroy: vi.fn()};
    mocks.success.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const notice = ref(''), session = ref(1), scope = effectScope();
    scope.run(() => useCraftToasts(notice, session));
    notice.value = 'Удалено'; await nextTick();
    mocks.success.mock.calls[0][1].onAfterLeave();
    notice.value = 'Создано'; await nextTick();
    session.value++; await nextTick();
    expect(first.destroy).not.toHaveBeenCalled();
    expect(second.destroy).toHaveBeenCalledTimes(1);
    scope.stop(); expect(second.destroy).toHaveBeenCalledTimes(1);
  });
});

import { createRenderer, h, reactive, ssrContextKey } from 'vue';
import { afterEach, expect, it, vi } from 'vitest';
import ToastContent from '../src/components/ToastContent.vue';
import { useToasts } from '../src/hooks/useToasts';
const api = vi.hoisted(() => ({error: vi.fn(), info: vi.fn(), loading: vi.fn()}));
vi.mock('naive-ui', () => ({useMessage: () => api}));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('uses the message type and exact timeout for each countdown, including persistent loading', () => {
  const toasts = useToasts();
  toasts.error('Ошибка', {duration: 2500});
  toasts.info('Сообщение');
  toasts.loading('Подождите');
  for (const [kind, duration] of [['error', 2500], ['info', 5000], ['loading', 0]] as const) {
    const [render, options] = api[kind].mock.calls[0];
    expect(render().props).toMatchObject({type: kind, duration});
    expect(options).toMatchObject({duration, keepAliveOnHover: false});
  }
});

it('reduces the visible indicator until expiry and cancels updates on unmount', () => {
  let now = 100, frame: FrameRequestCallback | undefined;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1; }));
  const cancel = vi.fn(); vi.stubGlobal('cancelAnimationFrame', cancel);
  const renderer = createRenderer<any, any>({
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText() {}, setElementText() {}, patchProp() {}, insert() {}, remove() {}, parentNode: () => null, nextSibling: () => null,
  });
  let state: any;
  const app = renderer.createApp({setup(props, context) {
    state = (ToastContent as any).setup(reactive({duration: 5000, type: 'error'}), context);
    return () => h('div');
  }});
  app.provide(ssrContextKey, {modules: new Set()}); app.mount({});
  expect(state.remaining.value).toBe(100);
  now += 2500; frame!(now); expect(state.remaining.value).toBe(50);
  now += 2500; frame!(now); expect(state.remaining.value).toBe(0);
  app.unmount(); expect(cancel).toHaveBeenCalledWith(1);
});

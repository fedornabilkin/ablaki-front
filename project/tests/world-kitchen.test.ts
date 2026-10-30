import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, ref } from 'vue';
import { clientView, findView, flushView, mountView, viewText } from './helpers/clientView';
import WorldKitchenPanel from '../src/components/pages/world/WorldKitchenPanel.vue';
import WorldHelpHint from '../src/components/pages/world/WorldHelpHint.vue';
const mocks = vi.hoisted(() => ({ load: vi.fn(), runner: null as any }));
vi.mock('naive-ui', () => {
  const block = (tag: string) => ({ setup: (_: unknown, { slots, attrs }: any) => () => h(tag, attrs, slots.default?.()) });
  return { NButton: block('button'), NAlert: block('aside'), NSpin: block('span'), NPopover: block('div') };
});
vi.mock('../src/services/api/worldKitchen', () => ({ loadKitchen: mocks.load }));
vi.mock('../src/hooks/useSimpleWorldCommand', () => ({ useSimpleWorldCommand: () => mocks.runner }));
vi.mock('../src/services/api/world', () => ({ worldError: () => 'Ошибка загрузки' }));
clientView(WorldKitchenPanel, 'components/pages/world/WorldKitchenPanel.vue');
clientView(WorldHelpHint, 'components/pages/world/WorldHelpHint.vue');
const state = () => ({ nodeId: 12, serverTime: 1000, used: false, current: { code: 'breakfast', name: 'Завтрак', startsAt: 900, endsAt: 1002 }, next: { code: 'lunch', name: 'Обед', startsAt: 2000, endsAt: 2500 },
  health: { hp: 70, maximum: 100, revision: 4, foods: [{ code: 'carrot', name: 'Морковь', quantity: 2, kitchenRestore: 15 }] } });
let app: { unmount: () => void } | undefined;
beforeEach(() => {
  vi.useFakeTimers(); vi.resetAllMocks();
  mocks.runner = { busy: ref(false), pending: ref(null), error: ref(''), submit: vi.fn(), retry: vi.fn() };
  mocks.load.mockResolvedValue(state());
});
afterEach(() => { app?.unmount(); app = undefined; vi.useRealTimers(); });
function mount() { const view = mountView(WorldKitchenPanel, () => ({ nodeId: 12, owner: 1, session: 1, writable: true })); app = view.app; return view; }
describe('kitchen serving hours', () => {
  it('sends the selected kitchen and health revision, then shows the accepted meal', async () => {
    const view = mount(); await flushView();
    mocks.runner.submit.mockResolvedValue({}); mocks.load.mockResolvedValue({ ...state(), used: true });
    findView(view.root, n => n.tag === 'button' && viewText(n) === 'Поесть')!.props.onClick(); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledWith('economy/food', { code: 'carrot', health_revision: 4, kitchen_node_id: 12 });
    expect(viewText(view.root)).toContain('Порция списана из рюкзака');
    expect(findView(view.root, n => n.tag === 'button' && viewText(n) === 'Поесть')!.props.disabled).toBe(true);
  });
  it('counts down without requests and refreshes once when the serving window ends', async () => {
    const view = mount(); await flushView();
    mocks.load.mockResolvedValue({ ...state(), serverTime: 1002, current: null });
    await vi.advanceTimersByTimeAsync(1000); await flushView(); expect(mocks.load).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1000); await flushView(); expect(mocks.load).toHaveBeenCalledTimes(2);
    expect(viewText(view.root)).toContain('Сейчас перерыв'); expect(viewText(view.root)).toContain('00:16:38');
    await vi.advanceTimersByTimeAsync(1000); await flushView(); expect(viewText(view.root)).toContain('00:16:37'); expect(mocks.load).toHaveBeenCalledTimes(2);
  });
  it('backs off after a failed boundary refresh and clears timers on unmount', async () => {
    const view = mount(); await flushView(); mocks.load.mockRejectedValue(new Error('offline'));
    await vi.advanceTimersByTimeAsync(5000); await flushView(); expect(mocks.load).toHaveBeenCalledTimes(2);
    expect(viewText(view.root)).toContain('Повторить загрузку кухни');
    view.app.unmount(); app = undefined; await vi.advanceTimersByTimeAsync(20000); expect(mocks.load).toHaveBeenCalledTimes(2);
  });
});

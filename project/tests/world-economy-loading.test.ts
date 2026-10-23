import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, reactive, ref } from 'vue';
import { clientView, findView, flushView, mountView, viewText } from './helpers/clientView';
import WorldMvpProgress from '../src/components/pages/world/WorldMvpProgress.vue';
import WorldStorageExpansion from '../src/components/pages/world/WorldStorageExpansion.vue';

const mocks = vi.hoisted(() => ({ mvp: vi.fn(), storage: vi.fn(), runner: null as any }));
vi.mock('naive-ui', () => {
  const block = (tag: string) => ({ setup: (_: unknown, { slots, attrs }: any) => () => h(tag, attrs, slots.default?.()) });
  const modal = { props: { show: Boolean }, setup: (props: any, { slots }: any) => () => props.show ? h('section', { role: 'dialog' }, slots.default?.()) : null };
  return { NModal: modal, NSpin: block('span'), NTabs: block('div'), NTabPane: block('div'), NAlert: block('aside'), NButton: block('button'), NProgress: block('progress') };
});
vi.mock('../src/hooks/useSimpleWorldCommand', () => ({ useSimpleWorldCommand: () => mocks.runner }));
vi.mock('../src/services/api/worldMvp', () => ({ loadMvp: mocks.mvp, milestoneLabels: {} }));
vi.mock('../src/services/api/worldEconomyStorage', () => ({ loadEconomyStorage: mocks.storage, previewEconomyStorage: vi.fn() }));
vi.mock('../src/services/api/world', () => ({ isClosedTestError: () => false, worldError: () => 'Ошибка запроса' }));
clientView(WorldMvpProgress, 'components/pages/world/WorldMvpProgress.vue');
clientView(WorldStorageExpansion, 'components/pages/world/WorldStorageExpansion.vue');
let app: { unmount: () => void } | undefined;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.runner = { busy: ref(false), pending: ref(null), error: ref(''), submit: vi.fn(), retry: vi.fn() };
});
afterEach(() => { app?.unmount(); app = undefined; });

describe('economy panel load recovery', () => {
  it('loads the remaining-step badge before opening the modal and updates it after a revision', async () => {
    const goal = (code: string, claimed: boolean, completed: boolean[]) => ({code, claimed, steps: completed.map((completed, i) => ({code: String(i), completed}))});
    mocks.mvp.mockResolvedValue({goals: [goal('day-1', false, [true, false]), goal('day-2', false, [false, false]), goal('old', true, [false])]});
    const props = reactive({owner: 1, session: 1, revision: 1, writable: true});
    const view = mountView(WorldMvpProgress, () => props); app = view.app; await flushView();
    expect(findView(view.root, n => n.props['aria-label'] === 'Осталось заданий: 3')).toBeDefined();
    expect(findView(view.root, n => n.props.role === 'dialog')).toBeUndefined();
    mocks.mvp.mockResolvedValue({goals: [goal('day-1', true, [true, true]), goal('day-2', false, [true, false])]});
    props.revision++; await flushView();
    expect(findView(view.root, n => n.props['aria-label'] === 'Осталось заданий: 1')).toBeDefined();
  });
  it('explains an unfunded completed goal, links to the forum list and enables available food', async () => {
    mocks.mvp.mockResolvedValue({ enabled: true, feedback: '/forum', goals: [{ code: 'day-1', claimed: false, funded: false, canClaim: false, credits: '50.0000', blockedReason: 'Организатору нужно обеспечить резерв', steps: [{ code: 'camp', completed: true, quantity: 1, required: 1 }] }], quotas: [],
      health: { hp: 100, maximum: 100, canEat: true, revision: 4, foods: [{ code: 'carrot', name: 'Морковь', restore: 4, quantity: 2, canEat: true, repeatLimit: 2, repeatRemaining: 1, repeatSeconds: 21600 }] } });
    const view = mountView(WorldMvpProgress, () => ({ owner: 1, session: 1, writable: true })); app = view.app;
    findView(view.root, n => n.tag === 'button' && n.props['aria-label'] === 'Задания')!.props.onClick(); await flushView();
    expect(findView(view.root, n => n.tag === 'button' && viewText(n) === 'Ожидает резерва')!.props.disabled).toBe(true);
    expect(viewText(view.root)).toContain('Награда ожидает резерва');
    expect(findView(view.root, n => n.tag === 'a' && viewText(n).includes('Сообщить'))!.props.to).toBe('/forum');
    findView(view.root, n => n.props.type === 'segment')!.props['onUpdate:value']('health'); await flushView();
    const eat = findView(view.root, n => n.tag === 'button' && viewText(n) === 'Поесть')!;
    expect(eat.props.disabled).toBe(false); expect(eat.props.type).toBe('primary');
    eat.props.onClick(); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledWith('economy/food', { code: 'carrot', health_revision: 4 });
  });
  it('switches four journey tabs and closes the modal when following a task action', async () => {
    const goal = (code: string) => ({ code, claimed: false, funded: true, canClaim: false, credits: '50.0000', steps: [{ code: 'camp', completed: false, quantity: 0, required: 1, href: '/world/nodes/5' }] });
    mocks.mvp.mockResolvedValue({ enabled: true, feedback: '/forum/read/80', personalCredits: '250.0000', goals: [goal('day-1'), goal('day-2')], quotas: [{ kind: 'extraction_daily', maximum: 20, remaining: 12, restoresAt: 100, grossRemaining: null }], health: { hp: 85, maximum: 100, revision: 2, foods: [{ code: 'carrot', name: 'Морковь', restore: 15, quantity: 2 }] } });
    const view = mountView(WorldMvpProgress, () => ({ owner: 1, session: 1, revision: 1, writable: true })); app = view.app;
    findView(view.root, node => node.tag === 'button' && node.props['aria-label'] === 'Задания')!.props.onClick(); await flushView();
    const tabs = findView(view.root, node => node.props.type === 'segment')!;
    expect(tabs.children.map(child => child.props.tab).filter(Boolean)).toEqual(['Лагерь', 'Ресурсы', 'Лимиты', 'Здоровье']);
    expect(viewText(view.root)).toContain('Первый лагерь');
    tabs.props['onUpdate:value']('resources'); await flushView(); expect(viewText(view.root)).toContain('Ресурсы и первый металл');
    tabs.props['onUpdate:value']('quotas'); await flushView(); expect(viewText(view.root)).toContain('12 / 20');
    tabs.props['onUpdate:value']('health'); await flushView(); expect(viewText(view.root)).toContain('85 / 100'); expect(viewText(view.root)).toContain('Морковь');
    tabs.props['onUpdate:value']('camp'); await flushView();
    const action = findView(view.root, node => node.tag === 'a' && viewText(node).includes('К действию'))!;
    expect(action.props.to).toBe('/world/nodes/5'); action.props.onClick(); await flushView();
    expect(findView(view.root, node => node.props.role === 'dialog')).toBeUndefined(); expect(mocks.mvp).toHaveBeenCalledOnce();
  });
  it('shows a failed initial route request and recovers without a game command', async () => {
    mocks.mvp.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ enabled: true, feedback: '/forum/read/80', goals: [], quotas: [], health: { hp: 100, maximum: 100, foods: [] } });
    const view = mountView(WorldMvpProgress, () => ({ owner: 1, session: 1, revision: 1, writable: true })); app = view.app;
    await flushView();
    expect(mocks.mvp).toHaveBeenCalledOnce();
    findView(view.root, node => node.tag === 'button' && node.props['aria-label'] === 'Задания')!.props.onClick(); await flushView();
    expect(viewText(view.root)).toContain('Ошибка запроса');
    const retry = findView(view.root, node => node.tag === 'button' && viewText(node).includes('Повторить загрузку'))!;
    retry.props.onClick(); await flushView();
    expect(viewText(view.root)).not.toContain('Ошибка запроса');
    expect(viewText(view.root)).toContain('Сообщить о проблеме на форуме');
    expect(mocks.mvp).toHaveBeenCalledTimes(2);
    expect(mocks.runner.submit).not.toHaveBeenCalled();
  });

  it('shows a failed storage request, then offers expansion only after retry succeeds', async () => {
    mocks.storage.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ id: 5, capacity: 20, writable: true, options: [{ code: 'small', slots: 5, after: 25, price: '10.0000' }] });
    const view = mountView(WorldStorageExpansion, () => ({ storage: 5, session: 1, revision: 1, writable: true, command: mocks.runner })); app = view.app;
    await flushView();
    expect(viewText(view.root)).toContain('Ошибка запроса');
    expect(viewText(view.root)).not.toContain('Оплатить расширение');
    findView(view.root, node => node.tag === 'button' && viewText(node).includes('Повторить загрузку'))!.props.onClick();
    await flushView();
    expect(viewText(view.root)).not.toContain('Ошибка запроса');
    expect(viewText(view.root)).toContain('Постоянная вместимость: 20');
    expect(viewText(view.root)).toContain('+5 мест');
    expect(mocks.storage).toHaveBeenCalledTimes(2);
    expect(mocks.runner.submit).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, reactive, ref } from 'vue';
import { clientView, findView, flushView, mountView, viewText } from './helpers/clientView';
import WorldMvpProgress from '../src/components/pages/world/WorldMvpProgress.vue';
import WorldDevelopmentRoute from '../src/components/pages/world/WorldDevelopmentRoute.vue';
import WorldStorageExpansion from '../src/components/pages/world/WorldStorageExpansion.vue';
import WorldPaymentSources from '../src/components/pages/world/WorldPaymentSources.vue';
import WorldHelpHint from '../src/components/pages/world/WorldHelpHint.vue';

const mocks = vi.hoisted(() => ({ mvp: vi.fn(), storage: vi.fn(), storagePreview: vi.fn(), runner: null as any }));
vi.mock('naive-ui', () => {
  const block = (tag: string) => ({ setup: (_: unknown, { slots, attrs }: any) => () => h(tag, attrs, slots.default?.()) });
  const modal = { props: { show: Boolean }, setup: (props: any, { slots }: any) => () => props.show ? h('section', { role: 'dialog' }, slots.default?.()) : null };
  return { NModal: modal, NPopover: block('div'), NSpin: block('span'), NTabs: block('div'), NTabPane: block('div'), NAlert: block('aside'), NButton: block('button'), NProgress: block('progress'), NInputNumber: block('input'), NCheckbox: block('input') };
});
vi.mock('../src/hooks/useSimpleWorldCommand', () => ({ useSimpleWorldCommand: () => mocks.runner }));
vi.mock('../src/services/api/worldMvp', () => ({ loadMvp: mocks.mvp, milestoneLabels: {} }));
vi.mock('../src/services/api/worldEconomyStorage', () => ({ loadEconomyStorage: mocks.storage, previewEconomyStorage: mocks.storagePreview }));
vi.mock('../src/services/api/world', () => ({ isClosedTestError: () => false, worldError: () => 'Ошибка запроса' }));
clientView(WorldMvpProgress, 'components/pages/world/WorldMvpProgress.vue');
clientView(WorldDevelopmentRoute, 'components/pages/world/WorldDevelopmentRoute.vue');
clientView(WorldPaymentSources, 'components/pages/world/WorldPaymentSources.vue');
clientView(WorldHelpHint, 'components/pages/world/WorldHelpHint.vue');
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
    const view = mountView(WorldMvpProgress, () => ({ owner: 1, session: 1, revision: 1, writable: true })); app = view.app;
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
  it('opens the development route and closes it when following a step', async () => {
    mocks.mvp.mockResolvedValue({ enabled: true, feedback: '/forum', goals: [], quotas: [], health: { hp: 100, maximum: 100, foods: [] },
      development: { version: 1, completed: 0, total: 1, nextStage: 'home', stages: [{ code: 'home', title: 'Своя стоянка', description: 'Начните с города.', completed: false,
        steps: [{ code: 'city_joined', title: 'Заселиться в город', completed: false, quantity: 0, required: 1, href: '/world' }] }] } });
    const view = mountView(WorldMvpProgress, () => ({ owner: 1, session: 1, revision: 1, writable: true })); app = view.app;
    findView(view.root, node => node.tag === 'button' && node.props['aria-label'] === 'Задания')!.props.onClick(); await flushView();
    expect(viewText(view.root)).toContain('От стоянки до буровой');
    const step = findView(view.root, node => node.tag === 'a' && node.props['aria-label'] === 'Заселиться в город')!;
    expect(step.props.to).toBe('/world'); step.props.onClick(); await flushView();
    expect(findView(view.root, node => node.props.role === 'dialog')).toBeUndefined();
    expect(mocks.runner.submit).not.toHaveBeenCalled();
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

  it('selects a progressive backpack total locally and confirms it through the shared storage endpoint', async () => {
    mocks.storage.mockResolvedValue({id: 5, kind: 'backpack', capacity: 20, writable: true, options: Array.from({length: 30}, (_, i) => ({code: `backpack-${i + 1}`, slots: i + 1, after: i + 21, price: `${5 * (i + 1) * (i + 2)}.0000`}))});
    const quote = {quote_id: 'a'.repeat(32), expected_revisions: {}, terms: {capacity_after: 30, slots: 10, price_cr: '550.0000'}, server_time: 1, expires_at: 100};
    mocks.storagePreview.mockResolvedValue(quote); mocks.runner.submit.mockResolvedValue({capacity_after: 30});
    const view = mountView(WorldStorageExpansion, () => ({storage: 5, session: 1, revision: 1, writable: true, command: mocks.runner})); app = view.app; await flushView();
    const input = findView(view.root, n => n.tag === 'input' && n.props['aria-label'] === 'Количество покупаемых слотов')!;
    input.props['onUpdate:value'](10); await flushView(); expect(mocks.storagePreview).not.toHaveBeenCalled();
    findView(view.root, n => n.tag === 'button' && viewText(n).includes('Рассчитать покупку'))!.props.onClick(); await flushView();
    expect(mocks.storagePreview).toHaveBeenCalledWith(5, 'backpack-10');
    findView(view.root, n => n.tag === 'button' && viewText(n).includes('Оплатить расширение'))!.props.onClick(); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledWith('/economy/storage/5/expand', {code: 'backpack-10'}, quote);
    expect(viewText(view.root)).toContain('Добавлено постоянных мест: 10.');
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

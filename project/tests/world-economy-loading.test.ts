import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, ref } from 'vue';
import { clientView, findView, flushView, mountView, viewText } from './helpers/clientView';
import WorldMvpProgress from '../src/components/pages/world/WorldMvpProgress.vue';
import WorldStorageExpansion from '../src/components/pages/world/WorldStorageExpansion.vue';

const mocks = vi.hoisted(() => ({ mvp: vi.fn(), storage: vi.fn(), runner: null as any }));
vi.mock('naive-ui', () => {
  const block = (tag: string) => ({ setup: (_: unknown, { slots, attrs }: any) => () => h(tag, attrs, slots.default?.()) });
  return { NAlert: block('aside'), NButton: block('button'), NCollapse: block('div'), NCollapseItem: block('div'), NProgress: block('progress') };
});
vi.mock('../src/hooks/useSimpleWorldCommand', () => ({ useSimpleWorldCommand: () => mocks.runner }));
vi.mock('../src/services/api/worldMvp', () => ({ loadMvp: mocks.mvp, milestoneLabels: {} }));
vi.mock('../src/services/api/worldEconomyStorage', () => ({ loadEconomyStorage: mocks.storage, previewEconomyStorage: vi.fn() }));
vi.mock('../src/services/api/world', () => ({ worldError: () => 'Ошибка запроса' }));
clientView(WorldMvpProgress, 'components/pages/world/WorldMvpProgress.vue');
clientView(WorldStorageExpansion, 'components/pages/world/WorldStorageExpansion.vue');
let app: { unmount: () => void } | undefined;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.runner = { busy: ref(false), pending: ref(null), error: ref(''), submit: vi.fn(), retry: vi.fn() };
});
afterEach(() => { app?.unmount(); app = undefined; });

describe('economy panel load recovery', () => {
  it('shows a failed initial route request and recovers without a game command', async () => {
    mocks.mvp.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ enabled: true, feedback: '/forum/read/80', goals: [], quotas: [], health: { hp: 100, maximum: 100, foods: [] } });
    const view = mountView(WorldMvpProgress, () => ({ owner: 1, session: 1, revision: 1, writable: true })); app = view.app;
    await flushView();
    expect(viewText(view.root)).toContain('Ошибка запроса');
    const retry = findView(view.root, node => node.tag === 'button' && viewText(node).includes('Повторить загрузку'))!;
    retry.props.onClick(); await flushView();
    expect(viewText(view.root)).not.toContain('Ошибка запроса');
    expect(viewText(view.root)).toContain('Переводы кредитов');
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

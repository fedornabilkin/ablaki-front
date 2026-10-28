import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, ref } from 'vue';
import { clientView, findView, flushView, mountView, viewText } from './helpers/clientView';
import WorldMiningPanel from '../src/components/pages/world/WorldMiningPanel.vue';
import WorldHelpHint from '../src/components/pages/world/WorldHelpHint.vue';
import WorldWorkProgress from '../src/components/pages/world/WorldWorkProgress.vue';

const mocks = vi.hoisted(() => ({ load: vi.fn(), storages: vi.fn(), runner: null as any }));
vi.mock('naive-ui', () => {
  const block = (tag: string) => ({ setup: (_: unknown, { slots, attrs }: any) => () => h(tag, attrs, slots.default?.()) });
  const popover = { setup: (_: unknown, { slots }: any) => () => h('div', [slots.trigger?.(), slots.default?.()]) };
  return { NPopover: popover, NProgress: block('progress'), NAlert: block('aside'), NButton: block('button'), NSelect: block('select') };
});
vi.mock('../src/hooks/useSimpleWorldCommand', () => ({ useSimpleWorldCommand: () => mocks.runner }));
vi.mock('../src/services/api/worldMining', () => ({ loadMining: mocks.load, parseMining: (value: unknown) => value }));
vi.mock('../src/services/api/worldStorage', () => ({ loadStorageList: mocks.storages }));
clientView(WorldMiningPanel, 'components/pages/world/WorldMiningPanel.vue');
clientView(WorldHelpHint, 'components/pages/world/WorldHelpHint.vue');
clientView(WorldWorkProgress, 'components/pages/world/WorldWorkProgress.vue');
let app: { unmount: () => void } | undefined;
const state = (node_id = 4) => ({ node_id, ready: true, working: false, workers: 0, produced_quantity: 0, pending_quantity: 0, seconds_per_unit: 120, server_time: 100,
  actions: [{ code: 'gather-log', work_seconds: 120, cooldown_seconds: 0, output: [{ code: 'classic-log', name: 'Бревно', quantity: 1 }], tools: ['classic-hammer'], tool_names: ['Молоток'], daily_limit: null }],
  action_code: null, worked_seconds: 0, output_storage_id: null,
  output_storages: [{id: 8, name: 'Рюкзак', kind: 'backpack', capacity: 20}, {id: 9, name: 'Местный мини-склад', kind: 'stockpile', capacity: 5}] });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.runner = { busy: ref(false), pending: ref(null), error: ref(''), submit: vi.fn(), retry: vi.fn() };
  mocks.load.mockResolvedValue(state());
  mocks.storages.mockResolvedValue([{ id: 9, kind: 'stockpile', name: 'Склад', capacity: 50 }, { id: 10, kind: 'recovery', name: 'Возврат', capacity: 50 }]);
});
afterEach(() => { app?.unmount(); app = undefined; vi.useRealTimers(); });
describe('source batch destination', () => {
  it('explains a missing tool and blocks the start before sending a command', async () => {
    mocks.load.mockResolvedValue({ ...state(), actions: [{ ...state().actions[0], unavailable_reason: 'Нужен исправный инструмент: Молоток.' }] });
    const view = mountView(WorldMiningPanel, () => ({ nodeId: 4, owner: 1, session: 1, writable: true })); app = view.app; await flushView();
    const button = findView(view.root, n => n.tag === 'button' && viewText(n).includes('Работать над партией'))!;
    expect(button.props.disabled).toBe(true); expect(viewText(view.root)).toContain('Нужен исправный инструмент: Молоток.');
    button.props.onClick(); await flushView(); expect(mocks.runner.submit).not.toHaveBeenCalled();
  });
  it('uses the same action control while starting and synchronizing a batch', async () => {
    vi.useFakeTimers();
    const working = { ...state(), working: true, action_code: 'gather-log', required_seconds: 120 };
    const view = mountView(WorldMiningPanel, () => ({ nodeId: 4, owner: 1, session: 1, writable: true })); app = view.app; await flushView();
    const button = findView(view.root, n => n.tag === 'button' && viewText(n).includes('Работать над партией'))!;
    mocks.runner.submit.mockImplementation(async () => { mocks.runner.busy.value = true; mocks.runner.pending.value = {}; await Promise.resolve(); mocks.runner.busy.value = false; mocks.runner.pending.value = null; return working; });
    button.props.onClick(); await flushView(); await vi.advanceTimersByTimeAsync(10_000); await flushView();
    expect(mocks.runner.submit).toHaveBeenLastCalledWith('objects/4/mining/heartbeat', {});
    expect(findView(view.root, n => n.tag === 'button' && viewText(n).includes('Приостановить добычу'))).toBe(button);
    expect(findView(view.root, n => n.tag === 'button' && viewText(n).includes('Повторить запрос'))).toBeUndefined();
  });
  it('animates between server replies, then checks completion while preserving the work controls', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
    const working = { ...state(), working: true, action_code: 'gather-log', required_seconds: 2, work_id: 7, live_work: [{ accounted_at: 100, last_seen_at: 100 }] };
    mocks.load.mockResolvedValue(working); mocks.runner.submit.mockResolvedValue(working);
    const view = mountView(WorldMiningPanel, () => ({ nodeId: 4, owner: 1, session: 1, writable: true })); app = view.app; await flushView();
    const stop = findView(view.root, node => node.tag === 'button' && viewText(node).includes('Приостановить добычу'))!;
    const progress = findView(view.root, node => node.tag === 'progress')!;
    expect(progress.props.percentage).toBe(0);
    await vi.advanceTimersByTimeAsync(1000); await flushView(); expect(progress.props.percentage).toBeCloseTo(50);
    await vi.advanceTimersByTimeAsync(1100); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledWith('objects/4/mining/heartbeat', {});
    expect(findView(view.root, node => node.tag === 'progress')).toBe(progress);
    expect(findView(view.root, node => node.tag === 'button' && viewText(node).includes('Приостановить добычу'))).toBe(stop);
  });
  it('ignores an older read that arrives after starting work', async () => {
    vi.useFakeTimers();
    let finish!: (value: unknown) => void;
    mocks.load.mockResolvedValueOnce(state()).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const view = mountView(WorldMiningPanel, () => ({ nodeId: 4, owner: 1, session: 1, writable: true })); app = view.app; await flushView();
    await vi.advanceTimersByTimeAsync(10_000);
    mocks.runner.submit.mockResolvedValue({ ...state(), working: true, action_code: 'gather-log' });
    findView(view.root, node => node.tag === 'button' && viewText(node).includes('Работать над партией'))!.props.onClick(); await flushView();
    finish(state()); await flushView(); expect(viewText(view.root)).toContain('Приостановить добычу');
  });
  it('shows the trap cooldown from server time and disables a premature claim', async () => {
    mocks.load.mockResolvedValue({ ...state(), actions: [{ ...state().actions[0], code: 'make-raw-hide', work_seconds: 0, cooldown_seconds: 21600, available_at: 500 }] });
    const view = mountView(WorldMiningPanel, () => ({ nodeId: 4, owner: 1, session: 1, writable: true })); app = view.app;
    await flushView();
    expect(viewText(view.root)).toContain('Следующая партия доступна');
    expect(findView(view.root, node => node.tag === 'button' && viewText(node).includes('Получить готовую партию'))!.props.disabled).toBe(true);
    expect(mocks.runner.submit).not.toHaveBeenCalled();
  });
  it('submits the selected output storage and refreshes inventory when a batch arrives', async () => {
    const changed = vi.fn();
    mocks.load.mockResolvedValue({...state(), output_storages: [...state().output_storages, {id: 10, name: 'Второй мини-склад', kind: 'stockpile', capacity: 5}]});
    const view = mountView(WorldMiningPanel, () => ({ nodeId: 4, owner: 1, session: 1, writable: true, onChanged: changed })); app = view.app;
    await flushView();
    expect(viewText(view.root)).toContain('Молоток');
    expect(findView(view.root, node => node.tag === 'button' && viewText(node) === 'Рюкзак')!.props['aria-pressed']).toBe(true);
    const group = findView(view.root, node => node.props['aria-label'] === 'Куда поступит добыча')!;
    expect(group.children.filter(node => node.tag === 'button' && viewText(node) === 'Мини-склад')).toHaveLength(1);
    findView(view.root, node => node.tag === 'button' && viewText(node) === 'Мини-склад')!.props.onClick();
    mocks.runner.submit.mockResolvedValue({ ...state(), produced_quantity: 1 });
    findView(view.root, node => node.tag === 'button' && viewText(node).includes('Работать над партией'))!.props.onClick();
    await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledWith('objects/4/mining/start', { action_code: 'gather-log', output_destination: 'mini_storage' });
    expect(changed).toHaveBeenCalledOnce();
  });
  it('returns an idle owner to backpack when the selected local mini-storage becomes unavailable', async () => {
    vi.useFakeTimers();
    const view = mountView(WorldMiningPanel, () => ({nodeId: 4, owner: 1, session: 1, writable: true})); app = view.app; await flushView();
    findView(view.root, n => n.tag === 'button' && viewText(n) === 'Мини-склад')!.props.onClick(); await flushView();
    mocks.load.mockResolvedValue({...state(), output_storages: [state().output_storages[0]]});
    await vi.advanceTimersByTimeAsync(10_000); await flushView();
    expect(findView(view.root, n => n.tag === 'button' && viewText(n) === 'Рюкзак')!.props['aria-pressed']).toBe(true);
    findView(view.root, n => n.tag === 'button' && viewText(n).includes('Работать над партией'))!.props.onClick(); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledWith('objects/4/mining/start', {action_code: 'gather-log'});
  });
  it('discards a late mining response from the previous account session without loading a global storage list', async () => {
    let release!: (value: unknown) => void;
    mocks.load.mockReturnValueOnce(new Promise(resolve => { release = resolve; })).mockResolvedValueOnce({...state(), output_storages: []});
    const session = ref(1);
    const view = mountView(WorldMiningPanel, () => ({ nodeId: 4, owner: session.value, session: session.value, writable: true })); app = view.app;
    await flushView(); session.value = 2; await flushView();
    release({...state(), output_storages: [{ id: 99, kind: 'stockpile', name: 'Чужое хранилище', capacity: 50 }]}); await flushView();
    expect(findView(view.root, node => node.props['aria-label'] === 'Куда поступит добыча')).toBeUndefined();
    expect(mocks.storages).not.toHaveBeenCalled();
  });
});

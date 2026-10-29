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
  return { NPopover: popover, NSpin: block('span'), NProgress: block('progress'), NAlert: block('aside'), NButton: block('button'), NSelect: block('select') };
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
afterEach(() => { app?.unmount(); app = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('source batch destination', () => {
  it('shows the remaining daily quota before work starts and counts down from server time', async () => {
    vi.useFakeTimers({toFake: ['setInterval', 'clearInterval', 'performance']});
    mocks.load.mockResolvedValue({...state(), quota: {maximum: 20, remaining: 7, restores_at: 180}});
    const view = mountView(WorldMiningPanel, () => ({nodeId: 4, owner: 1, session: 1, writable: true})); app = view.app; await flushView();
    const limit = findView(view.root, n => n.props.class === 'mining-quota')!;
    expect(viewText(limit)).toContain('Добыч за день осталось: 7 / 20'); expect(viewText(limit)).toContain('00:01:20');
    await vi.advanceTimersByTimeAsync(2000); await flushView(); expect(viewText(limit)).toContain('00:01:18');
    expect(mocks.runner.submit).not.toHaveBeenCalled();
  });
  it('shows an exhausted daily quota and blocks starting before a request is sent', async () => {
    mocks.load.mockResolvedValue({...state(), quota: {maximum: 20, remaining: 0, restores_at: 180}});
    const view = mountView(WorldMiningPanel, () => ({nodeId: 4, owner: 1, session: 1, writable: true})); app = view.app; await flushView();
    expect(viewText(view.root)).toContain('Добыч за день осталось: 0 / 20'); expect(viewText(view.root)).toContain('Лимит исчерпан.');
    const action = findView(view.root, n => n.tag === 'button' && viewText(n).includes('Работать над партией'))!;
    expect(action.props.disabled).toBe(true); action.props.onClick(); await flushView(); expect(mocks.runner.submit).not.toHaveBeenCalled();
  });
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
    const revision = ref(1);
    let finish!: (value: unknown) => void;
    mocks.load.mockResolvedValueOnce(state()).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const view = mountView(WorldMiningPanel, () => ({ nodeId: 4, owner: 1, session: 1, writable: true, revision: revision.value })); app = view.app; await flushView();
    revision.value++; await flushView();
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
  it('refreshes changed storage choices on demand without polling an idle owner', async () => {
    vi.useFakeTimers();
    const revision = ref(1);
    const view = mountView(WorldMiningPanel, () => ({nodeId: 4, owner: 1, session: 1, writable: true, revision: revision.value})); app = view.app; await flushView();
    findView(view.root, n => n.tag === 'button' && viewText(n) === 'Мини-склад')!.props.onClick(); await flushView();
    mocks.load.mockResolvedValue({...state(), output_storages: [state().output_storages[0]]});
    await vi.advanceTimersByTimeAsync(10_000); await flushView();
    expect(mocks.load).toHaveBeenCalledTimes(1);
    revision.value++; await flushView();
    expect(mocks.load).toHaveBeenCalledTimes(2);
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

describe('source network activity', () => {
  const working = () => ({...state(), working: true, work_id: 7, action_code: 'gather-log', required_seconds: 120, live_work: [{accounted_at: 100, last_seen_at: 100}]});
  it('unlocks a source cooldown locally without polling or starting a batch', async () => {
    vi.useFakeTimers(); mocks.load.mockResolvedValue({...state(),actions: [{...state().actions[0],work_seconds: 0,available_at: 102}]});
    const view = mountView(WorldMiningPanel, () => ({nodeId: 4,owner: 1,session: 1,writable: true})); app = view.app; await flushView();
    const button = () => findView(view.root,n => n.tag === 'button' && viewText(n).includes('Получить готовую партию'))!;
    expect(button().props.disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(3000); await flushView(); expect(button().props.disabled).toBe(false);
    expect(mocks.load).toHaveBeenCalledTimes(1); expect(mocks.runner.submit).not.toHaveBeenCalled();
  });
  it('offers one explicit quota refresh after its deadline instead of polling or spending a batch', async () => {
    vi.useFakeTimers(); mocks.load.mockResolvedValueOnce({...state(),quota: {maximum: 20,remaining: 0,restores_at: 102}}).mockResolvedValue({...state(),server_time: 103,quota: {maximum: 20,remaining: 20,restores_at: 86500}});
    const view = mountView(WorldMiningPanel, () => ({nodeId: 4,owner: 1,session: 1,writable: true})); app = view.app; await flushView();
    await vi.advanceTimersByTimeAsync(3000); await flushView(); expect(mocks.load).toHaveBeenCalledTimes(1);
    const refresh = findView(view.root,n => n.tag === 'button' && viewText(n) === 'Обновить лимит')!;
    expect(refresh.props.disabled).toBe(false); refresh.props.onClick(); await flushView();
    expect(mocks.load).toHaveBeenCalledTimes(2); expect(mocks.runner.submit).not.toHaveBeenCalled();
    expect(viewText(view.root)).toContain('Добыч за день осталось: 20 / 20');
  });
  it.each([state(), {...state(), action_code: 'gather-log', worked_seconds: 30}])('does not read or heartbeat an idle or paused source', async snapshot => {
    vi.useFakeTimers(); mocks.load.mockResolvedValue(snapshot);
    const view = mountView(WorldMiningPanel, () => ({nodeId: 4, owner: 1, session: 1, writable: true})); app = view.app; await flushView();
    await vi.advanceTimersByTimeAsync(60_000); await flushView();
    expect(mocks.load).toHaveBeenCalledTimes(1); expect(mocks.runner.submit).not.toHaveBeenCalled();
  });
  it('starts heartbeats after confirmation, stops after pause and starts again on resume', async () => {
    vi.useFakeTimers();
    const view = mountView(WorldMiningPanel, () => ({nodeId: 4, owner: 1, session: 1, writable: true})); app = view.app; await flushView();
    const button = () => findView(view.root,n => n.tag === 'button' && /Работать над партией|Приостановить добычу|Возобновить работу/.test(viewText(n)))!;
    mocks.runner.submit.mockResolvedValue(working()); button().props.onClick(); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledWith('objects/4/mining/start',{action_code: 'gather-log'});
    await vi.advanceTimersByTimeAsync(10_000); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledTimes(2);
    mocks.runner.submit.mockResolvedValue({...working(),working: false}); button().props.onClick(); await flushView();
    expect(mocks.runner.submit).toHaveBeenLastCalledWith('objects/4/mining/stop',{});
    const count = mocks.runner.submit.mock.calls.length;
    await vi.advanceTimersByTimeAsync(30_000); await flushView(); expect(mocks.runner.submit).toHaveBeenCalledTimes(count);
    mocks.runner.submit.mockResolvedValue(working()); button().props.onClick(); await flushView();
    await vi.advanceTimersByTimeAsync(10_000); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledTimes(count+2); expect(mocks.load).toHaveBeenCalledTimes(1);
  });
  it('defers a hidden panel and pauses network work in a background document', async () => {
    vi.useFakeTimers(); const events = new Map<string,()=>void>();
    const document = {visibilityState: 'visible',addEventListener: (name: string,callback: ()=>void) => events.set(name,callback),removeEventListener: (name: string) => events.delete(name)};
    vi.stubGlobal('document',document);
    const active = ref(false); mocks.load.mockResolvedValue(working()); mocks.runner.submit.mockResolvedValue(working());
    const view = mountView(WorldMiningPanel, () => ({nodeId: 4, owner: 1, session: 1, writable: true,active: active.value})); app = view.app; await flushView();
    await vi.advanceTimersByTimeAsync(20_000); expect(mocks.load).not.toHaveBeenCalled(); expect(mocks.runner.submit).not.toHaveBeenCalled();
    active.value = true; await flushView(); expect(mocks.load).toHaveBeenCalledTimes(1);
    document.visibilityState = 'hidden'; events.get('visibilitychange')!(); await flushView();
    await vi.advanceTimersByTimeAsync(30_000); expect(mocks.runner.submit).not.toHaveBeenCalled();
    document.visibilityState = 'visible'; events.get('visibilitychange')!(); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledTimes(1);
    active.value = false; await flushView(); await vi.advanceTimersByTimeAsync(30_000);
    expect(mocks.runner.submit).toHaveBeenCalledTimes(1);
    view.app.unmount(); app = undefined; expect(events.size).toBe(0);
  });
  it('suspends automatic work after an unconfirmed heartbeat instead of repeatedly starting new commands', async () => {
    vi.useFakeTimers(); mocks.load.mockResolvedValue(working()); mocks.runner.submit.mockResolvedValue(undefined);
    const revision = ref(1);
    const view = mountView(WorldMiningPanel, () => ({nodeId: 4, owner: 1, session: 1, writable: true, revision: revision.value})); app = view.app; await flushView();
    await vi.advanceTimersByTimeAsync(60_000); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledTimes(1); expect(mocks.load).toHaveBeenCalledTimes(1);
    mocks.load.mockResolvedValue(state()); revision.value++; await flushView();
    expect(mocks.load).toHaveBeenCalledTimes(2); expect(viewText(view.root)).toContain('Работать над партией');
  });
  it('coalesces completion checks and interval ticks while a ready batch awaits the server', async () => {
    vi.useFakeTimers(); const snapshot = {...working(),required_seconds: 2,actions: [{...state().actions[0],work_seconds: 2}]};
    mocks.load.mockResolvedValue(snapshot); mocks.runner.submit.mockResolvedValue(snapshot);
    const view = mountView(WorldMiningPanel, () => ({nodeId: 4, owner: 1, session: 1, writable: true})); app = view.app; await flushView();
    await vi.advanceTimersByTimeAsync(11_000); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10_000); expect(mocks.runner.submit).toHaveBeenCalledTimes(2);
  });
});

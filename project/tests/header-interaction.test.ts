import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { h, ref } from 'vue';
import { clientView, findView, flushView, mountView, viewText } from './helpers/clientView';
import NavBar from '../src/components/navbar/NavBar.vue';
import OnlineUsers from '../src/components/navbar/OnlineUsers.vue';
import DailyRewards from '../src/components/navbar/DailyRewards.vue';

const mocks = vi.hoisted(() => ({ count: vi.fn(), users: vi.fn(), claim: vi.fn(), available: null as any }));
vi.mock('/ablakin-fire-logo.png', () => ({ default: '/ablakin-fire-logo.png' }));
vi.mock('naive-ui', () => ({
  NButton: { setup: (_: unknown, { attrs, slots }: any) => () => h('button', attrs, slots.default?.()) },
  NModal: { props: ['show'], setup: (props: any, { slots }: any) => () => props.show ? h('section', { role: 'dialog' }, slots.default?.()) : null },
}));
vi.mock('vuex', () => ({ useStore: () => ({ state: { auth: { revision: 1 } }, getters: { 'auth/user': { id: 1 }, 'auth/isAuthenticated': false }, dispatch: vi.fn() }) }));
vi.mock('vue-router', () => ({ useRoute: () => ({ path: '/', fullPath: '/' }) }));
vi.mock('../src/store/world', () => ({ useWorldStore: () => ({ dataRevision: 1 }) }));
vi.mock('../src/components/navbar/HeaderAccount.vue', () => ({ default: { render: () => h('div') } }));
vi.mock('../src/components/pages/world/WorldMvpProgress.vue', () => ({ default: { render: () => h('div') } }));
vi.mock('../src/components/user/UserList.vue', () => ({ default: { render: () => h('div') } }));
vi.mock('../src/components/RequestState.vue', () => ({ default: { render: () => h('div') } }));
vi.mock('../src/hooks/useDailyRewards', () => ({ useDailyRewards: () => ({ available: { data: mocks.available }, claiming: ref(null), claim: mocks.claim }) }));
vi.mock('../src/services/api/portal', () => ({ onlineUsers: mocks.users, errorText: () => 'Ошибка' }));
vi.mock('../src/services/api/header', async importOriginal => ({ ...await importOriginal<typeof import('../src/services/api/header')>(), onlineCount: mocks.count }));
clientView(NavBar, 'components/navbar/NavBar.vue');
clientView(OnlineUsers, 'components/navbar/OnlineUsers.vue');
clientView(DailyRewards, 'components/navbar/DailyRewards.vue');
let app: { unmount: () => void } | undefined;
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  vi.stubGlobal('window', { scrollY: 0, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('document', { visibilityState: 'visible', addEventListener: vi.fn(), removeEventListener: vi.fn(), documentElement: { style: { setProperty: vi.fn() } } });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  mocks.available = ref({ items: [{ id: 'bonus' }] });
  mocks.count.mockResolvedValue({ count: 5, windowSeconds: 300 }); mocks.users.mockResolvedValue([]);
  mocks.claim.mockImplementation(() => { mocks.available.value = { items: [] }; });
});
afterEach(() => { app?.unmount(); app = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });

it('keeps online and bonus mounted through compact-header scroll changes and opens online without navigation', async () => {
  const view = mountView(NavBar); app = view.app; await flushView();
  const online = () => findView(view.root, node => node.tag === 'button' && node.props.title === 'Пользователи онлайн')!;
  const bonus = () => findView(view.root, node => node.tag === 'button' && String(node.props.class).includes('bonus-button'));
  const firstOnline = online(), firstBonus = bonus(); expect(firstBonus).toBeDefined();
  expect(firstOnline.props.href).toBeUndefined(); expect(viewText(firstOnline)).toContain('5');
  const scroll = vi.mocked(window.addEventListener).mock.calls.find(call => call[0] === 'scroll')![1] as () => void;
  for (const y of [300, 0, 400, 0]) { window.scrollY = y; scroll(); await flushView(); }
  expect(online()).toBe(firstOnline); expect(bonus()).toBe(firstBonus); expect(mocks.count).toHaveBeenCalledOnce();
  firstOnline.props.onClick(); await flushView();
  expect(findView(view.root, node => node.props.role === 'dialog')).toBeDefined(); expect(mocks.users).toHaveBeenCalledOnce();
  mocks.count.mockResolvedValue({ count: 6, windowSeconds: 300 });
  await vi.advanceTimersByTimeAsync(60_000); await flushView(); expect(online()).toBe(firstOnline); expect(viewText(online())).toContain('6');
  firstBonus!.props.onClick(); await flushView(); expect(mocks.claim).toHaveBeenCalledWith('bonus'); expect(bonus()).toBeUndefined();
});

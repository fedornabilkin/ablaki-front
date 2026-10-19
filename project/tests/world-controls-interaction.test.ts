import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, reactive, ref } from 'vue';
import { clientView, findView, flushView, mountView, viewText } from './helpers/clientView';
import WorldHarvestPanel from '../src/components/pages/world/WorldHarvestPanel.vue';
import WorldMap from '../src/components/pages/world/WorldMap.vue';
import WorldHelpHint from '../src/components/pages/world/WorldHelpHint.vue';
import WorldObjectPreview from '../src/components/pages/world/WorldObjectPreview.vue';
import WorldStoragePanel from '../src/components/pages/world/WorldStoragePanel.vue';
import WorldStorageGrid from '../src/components/pages/world/WorldStorageGrid.vue';
import WorldCreditInput from '../src/components/pages/world/WorldCreditInput.vue';
import WorldPlacedItemPanel from '../src/components/pages/world/WorldPlacedItemPanel.vue';
import WorldWorkspace from '../src/components/pages/world/WorldWorkspace.vue';
import WorldGardenPanel from '../src/components/pages/world/WorldGardenPanel.vue';
import WorldEquipmentExpansionPanel from '../src/components/pages/world/WorldEquipmentExpansionPanel.vue';
import WorldCultivationPanel from '../src/components/pages/world/WorldCultivationPanel.vue';
import WorldCampsiteSupplies from '../src/components/pages/world/WorldCampsiteSupplies.vue';
import SimpleBudgetPanel from '../src/components/pages/world/SimpleBudgetPanel.vue';
import SimpleBuildPanel from '../src/components/pages/world/SimpleBuildPanel.vue';
import WorldStartPanel from '../src/components/pages/world/WorldStartPanel.vue';
import WorldBuildPalette from '../src/components/pages/world/WorldBuildPalette.vue';
import BuildSettingsModal from '../src/components/pages/world/modals/BuildSettingsModal.vue';
import type { StorageView } from '../src/services/api/worldStorage';
import type { WorldNode } from '../src/entities/world/types';

const mocks = vi.hoisted(() => ({ budget: vi.fn(), builds: vi.fn(), templates: vi.fn(), startState: vi.fn(), push: vi.fn(), storageList: vi.fn(), storage: vi.fn(), transfer: vi.fn(), workspace: vi.fn(), preview: vi.fn(), mapPreview: vi.fn(), explorer: vi.fn(), garden: vi.fn(), gardenPreview: vi.fn(), equipment: vi.fn(), equipmentPreview: vi.fn(), cultivation: vi.fn(), crops: vi.fn(), cultivationPreview: vi.fn(), supplies: vi.fn(), suppliesPreview: vi.fn(), harvest: vi.fn(), harvestPreview: vi.fn(), runner: null as any, route: null as any }));
vi.mock('naive-ui', () => {
  const block = (tag: string) => ({ setup: (_: unknown, { slots, attrs }: any) => () => h(tag, attrs, slots.default?.()) });
  const popover = { setup: (_: unknown, { slots }: any) => () => h('div', [slots.trigger?.(), slots.default?.()]) };
  const modal = { props: { show: Boolean }, setup: (props: any, { slots }: any) => () => props.show ? h('section', { role: 'dialog' }, slots.default?.()) : null };
  return { NSkeleton: block('span'), NModal: modal, NPopover: popover, NTooltip: popover, NCard: block('section'), NProgress: block('progress'), NAlert: block('aside'), NButton: block('button'), NInputNumber: block('input'), NInput: block('input'), NSelect: block('select'), NSpin: block('span'), NCheckbox: block('input') };
});
vi.mock('vue-router', () => ({ useRoute: () => mocks.route, useRouter: () => ({ push: mocks.push }) }));
vi.mock('vuex', () => ({ useStore: () => ({ state: { auth: { revision: 1 } }, getters: { 'auth/user': { id: 1 } }, dispatch: vi.fn() }) }));
vi.mock('../src/hooks/useWorldCommand', () => ({ useWorldCommand: () => mocks.runner }));
vi.mock('../src/hooks/useSimpleWorldCommand', () => ({ useSimpleWorldCommand: () => mocks.runner }));
vi.mock('../src/services/api/simpleWorld', () => ({ activeBuild: async () => null, budget: mocks.budget, builds: mocks.builds, templates: mocks.templates, startState: mocks.startState, node: (value: unknown) => value, build: (value: unknown) => value }));
vi.mock('../src/services/api/worldStorage', () => ({ loadStorageList: mocks.storageList, loadStorageContents: mocks.storage, previewTransfer: mocks.transfer }));
vi.mock('../src/services/api/worldWorkspace', () => ({ loadWorkspace: mocks.workspace, previewWorkspace: mocks.preview }));
vi.mock('../src/services/api/worldHarvest', () => ({ loadHarvest: mocks.harvest, previewHarvest: mocks.harvestPreview }));
vi.mock('../src/services/api/worldGarden', () => ({ loadGarden: mocks.garden, previewGarden: mocks.gardenPreview }));
vi.mock('../src/services/api/worldEquipmentExpansion', () => ({ loadEquipmentExpansion: mocks.equipment, previewEquipmentExpansion: mocks.equipmentPreview }));
vi.mock('../src/services/api/worldCultivation', () => ({ loadCultivation: mocks.cultivation, loadCrops: mocks.crops, previewCultivation: mocks.cultivationPreview }));
vi.mock('../src/services/api/worldCampsite', () => ({ loadCampsiteSupplies: mocks.supplies, previewCampsiteSupplies: mocks.suppliesPreview }));
vi.mock('../src/services/api/world', () => ({ loadExplorer: mocks.explorer, previewProfession: vi.fn(), previewMapCells: mocks.mapPreview, worldError: () => 'Ошибка запроса' }));

clientView(WorldStorageGrid, 'components/pages/world/WorldStorageGrid.vue');
clientView(WorldCreditInput, 'components/pages/world/WorldCreditInput.vue');
clientView(WorldPlacedItemPanel, 'components/pages/world/WorldPlacedItemPanel.vue');
clientView(WorldStoragePanel, 'components/pages/world/WorldStoragePanel.vue');
clientView(WorldHarvestPanel, 'components/pages/world/WorldHarvestPanel.vue');
clientView(WorldMap, 'components/pages/world/WorldMap.vue');
clientView(WorldWorkspace, 'components/pages/world/WorldWorkspace.vue');
clientView(WorldGardenPanel, 'components/pages/world/WorldGardenPanel.vue');
clientView(WorldHelpHint, 'components/pages/world/WorldHelpHint.vue');
clientView(WorldObjectPreview, 'components/pages/world/WorldObjectPreview.vue');
clientView(WorldEquipmentExpansionPanel, 'components/pages/world/WorldEquipmentExpansionPanel.vue');
clientView(WorldCultivationPanel, 'components/pages/world/WorldCultivationPanel.vue');
clientView(WorldCampsiteSupplies, 'components/pages/world/WorldCampsiteSupplies.vue');
clientView(SimpleBudgetPanel, 'components/pages/world/SimpleBudgetPanel.vue');
clientView(SimpleBuildPanel, 'components/pages/world/SimpleBuildPanel.vue');
clientView(WorldStartPanel, 'components/pages/world/WorldStartPanel.vue');
clientView(WorldBuildPalette, 'components/pages/world/WorldBuildPalette.vue');
clientView(BuildSettingsModal, 'components/pages/world/modals/BuildSettingsModal.vue');
const quote = { quote_id: 'a'.repeat(32), expected_revisions: {}, server_time: 1, expires_at: 99999999, terms: {} };
const node: WorldNode = { id: 1, type: 'PLOT', label: 'Усадьба', name: 'Усадьба', code: '', root_id: 1, parent_id: null, status: 'active', visibility: 'private', revision: 1, portable: false, coordinates: { x: 0, y: 0 }, child_count: 0, descendant_count: 0, population_total: 0, owned_by_me: true, footprint: null, details: {}, permissions: { administer: false, manage: true, storage: true }, actions: [] };
let apps: { unmount: () => void }[] = [];
function mount(component: any, props?: () => Record<string, unknown>) { const result = mountView(component, props); apps.push(result.app); return result; }
beforeEach(() => {
  vi.resetAllMocks();
  mocks.budget.mockResolvedValue({ available: '0.0000', reserved: '0.0000' });
  mocks.explorer.mockResolvedValue(null);
  mocks.runner = { busy: ref(false), pending: ref(null), error: ref(''), submit: vi.fn().mockResolvedValue(undefined), retry: vi.fn() };
  mocks.route = reactive({ path: '/world/workspace/1', params: { id: '1' }, query: {} });
});
afterEach(() => { apps.forEach(app => app.unmount()); apps = []; vi.useRealTimers(); vi.unstubAllGlobals(); });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
describe('credit input precision', () => {
  it('formats values and placeholders while leaving an untouched exact amount unchanged', async () => {
    const value = ref('12.3499'), change = vi.fn((next: string) => { value.value = next; });
    const view = mount(WorldCreditInput, () => ({ value: value.value, placeholder: '10.0000', 'onUpdate:value': change }));
    const input = () => findView(view.root, node => node.tag === 'input')!;
    expect(input().props.value).toBe('12.3'); expect(input().props.placeholder).toBe('10');
    input().props.onFocus(); await flushView(); input().props.onBlur(); await flushView();
    expect(change).not.toHaveBeenCalled(); expect(value.value).toBe('12.3499');
    input().props.onFocus(); input().props['onUpdate:value']('15.99'); input().props.onBlur(); await flushView();
    expect(value.value).toBe('16'); expect(input().props.value).toBe('16');
  });
});
describe('placement construction flow', () => {
  const catalog = [{ id: 7, name: 'Огород', build_seconds: 60, world_build_seconds: 3600, material_summary: '', available: true }, { id: 8, name: 'Дом', build_seconds: 300, material_summary: 'Доска: 12', available: false, unavailable_reason: 'Не хватает досок' }];
  const response = { build: { id: 11, node_id: 12, labor_budget: '0.0000', status: 'building' }, node: { name: 'Огород' } };
  function setup() {
    const parent = ref({ ...node }), session = ref(1), selection = ref<{ x: number; y: number }[]>([]), revision = ref(1);
    mocks.templates.mockResolvedValue(catalog);
    const changed = vi.fn(() => { parent.value = { ...parent.value }; revision.value++; });
    const view = mount(WorldBuildPalette, () => ({ node: parent.value, map: { node_id: 1, items: [], cells: [{ x: 0, y: 0, state: 'open' }], can_expand: true }, selection: selection.value, owner: 1, session: session.value, revision: revision.value, writable: true, onChanged: changed }));
    return { ...view, parent, session, selection, changed };
  }
  it('collects settings before placing once in the chosen cell', async () => {
    const view = setup(); await flushView();
    const tile = () => findView(view.root, n => n.tag === 'button' && viewText(n).includes('Огород'))!;
    expect(tile().props.disabled).toBe(true);
    view.selection.value = [{ x: 0, y: 0 }]; await flushView(); expect(tile().props.disabled).toBe(false);
    expect(findView(view.root, n => n.tag === 'button' && viewText(n).includes('Дом'))!.props.disabled).toBe(true);
    mocks.runner.submit.mockResolvedValue(response); tile().props.onClick(); await flushView();
    expect(mocks.runner.submit).not.toHaveBeenCalled();
    expect(findView(view.root, n => n.props.role === 'dialog')).toBeDefined();
    const save = findView(view.root, n => n.tag === 'button' && viewText(n) === 'Сохранить')!;
    expect(save.props.disabled).toBeFalsy(); save.props.onClick(); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledWith('builds', { parent_id: 1, template_id: 7, name: 'Огород', labor_budget: '0', top_up: false, x: 0, y: 0 });
    expect(view.changed).toHaveBeenCalledOnce();
    expect(findView(view.root, n => n.props.role === 'dialog')).toBeUndefined();
  });
  it('ignores an old placement response after changing sessions', async () => {
    const view = setup(); const pending = deferred<typeof response>(); await flushView();
    view.selection.value = [{ x: 0, y: 0 }]; mocks.runner.submit.mockReturnValue(pending.promise); await flushView();
    findView(view.root, n => n.tag === 'button' && viewText(n).includes('Огород'))!.props.onClick();
    await flushView();
    findView(view.root, n => n.tag === 'button' && viewText(n) === 'Сохранить')!.props.onClick();
    view.session.value++; await flushView(); pending.resolve(response); await flushView();
    expect(view.changed).not.toHaveBeenCalled(); expect(findView(view.root, n => n.props.role === 'dialog')).toBeUndefined();
  });
  it.each([{ price: '50.0000', available: '10.0000', contribution: true }, { price: '50.0000', available: '50.0000', contribution: false }, { price: '0.0000', available: '0.0000', contribution: false }])('builds with the selected personal contribution: $price / $available', async ({ price, available, contribution }) => {
    mocks.budget.mockResolvedValue({ available, reserved: '0.0000' });
    const view = setup();
    mocks.templates.mockResolvedValue([{ ...catalog[0], economy: { price_cr: price, terms_digest: 'a'.repeat(64), profile_version: 1 } }]);
    view.session.value++; await flushView();
    view.selection.value = [{ x: 0, y: 0 }]; await flushView();
    findView(view.root, n => n.tag === 'button' && viewText(n).includes('Огород'))!.props.onClick(); await flushView();
    const checkbox = findView(view.root, n => n.tag === 'input' && viewText(n).includes('Добавить с баланса'));
    const save = () => findView(view.root, n => n.tag === 'button' && viewText(n) === 'Сохранить')!;
    expect(Boolean(checkbox)).toBe(contribution);
    if (contribution) { expect(save().props.disabled).toBe(true); checkbox!.props['onUpdate:checked'](true); await flushView(); }
    expect(save().props.disabled).toBeFalsy(); save().props.onClick(); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledWith('builds', expect.objectContaining({ top_up: contribution, terms_digest: 'a'.repeat(64) }));
  });
});
describe('restored world core panels', () => {
  it('requires confirmation before cancelling an unstarted build and returns to its parent map', async () => {
    const build = { id: 5, node_id: 1, parent_id: 9, status: 'building', owner_user_id: 1, required_seconds: 30, worked_seconds: 0, labor_budget: '0' };
    mocks.builds.mockResolvedValue({ items: [build] });
    const view = mount(SimpleBuildPanel, () => ({ node: { id: 1, status: 'constructing' }, owner: 1, session: 1 }));
    await flushView();
    const click = (label: string) => findView(view.root, n => n.tag === 'button' && viewText(n) === label)!.props.onClick();
    click('Отменить'); await flushView();
    expect(mocks.runner.submit).not.toHaveBeenCalled();
    expect(viewText(findView(view.root, n => n.props.role === 'dialog')!)).toContain('30% ресурсов не будут возвращены');
    click('Продолжить строительство'); await flushView();
    expect(findView(view.root, n => n.props.role === 'dialog')).toBeUndefined();
    expect(mocks.runner.submit).not.toHaveBeenCalled();
    click('Отменить'); await flushView();
    mocks.runner.submit.mockResolvedValue({ build: { ...build, status: 'cancelled' }, return_node_id: 9 });
    findView(findView(view.root, n => n.props.role === 'dialog')!, n => n.tag === 'button' && viewText(n) === 'Отменить')!.props.onClick(); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledExactlyOnceWith('builds/5/cancel', {});
    expect(mocks.push).toHaveBeenCalledWith('/world/nodes/9#map');
    expect(findView(view.root, n => n.props.role === 'dialog')).toBeUndefined();
  });
  it('closes construction cancellation confirmation when the session changes', async () => {
    mocks.builds.mockResolvedValue({ items: [{ id: 5, node_id: 1, status: 'building', owner_user_id: 1, required_seconds: 30, worked_seconds: 0, labor_budget: '0' }] });
    const session = ref(1);
    const view = mount(SimpleBuildPanel, () => ({ node: { id: 1, status: 'constructing' }, owner: 1, session: session.value }));
    await flushView();
    findView(view.root, n => n.tag === 'button' && viewText(n) === 'Отменить')!.props.onClick(); await flushView();
    session.value++; await flushView();
    expect(findView(view.root, n => n.props.role === 'dialog')).toBeUndefined();
    expect(mocks.runner.submit).not.toHaveBeenCalled();
  });
  it('rounds displayed budget balances and refreshes after funding', async () => {
    mocks.budget.mockResolvedValue({ available: '12.3500', reserved: '0.0000' });
    const changed = vi.fn();
    const view = mount(SimpleBudgetPanel, () => ({ nodeId: 1, owner: 1, session: 1, onChanged: changed }));
    await flushView();
    expect(viewText(view.root)).toContain('Доступно: 12.4 Cr. Зарезервировано на стройки: 0 Cr.');
    mocks.runner.submit.mockResolvedValue({});
    findView(view.root, n => n.tag === 'input')!.props['onUpdate:value']('2.55');
    findView(view.root, n => n.tag === 'button')!.props.onClick(); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledWith('objects/1/budget', { amount: '2.55' });
    expect(changed).toHaveBeenCalledOnce();
  });
  it('rounds construction payments without changing the underlying amount', async () => {
    mocks.templates.mockResolvedValue([]);
    mocks.builds.mockResolvedValue({ items: [{ id: 5, status: 'building', owner_user_id: 1, required_seconds: 30, worked_seconds: 1, labor_budget: '6.7800' }] });
    const view = mount(SimpleBuildPanel, () => ({ node: { id: 1, status: 'constructing', owner_user_id: 1 }, owner: 1, session: 1 }));
    await flushView();
    expect(viewText(view.root)).toContain('Бюджет помощников: 6.8 Cr');
    expect(viewText(view.root)).not.toContain('6.7800');
  });
  it('starts through the current API and opens the new construction in its tab', async () => {
    mocks.startState.mockResolvedValue(null);
    mocks.runner.submit.mockResolvedValue({ node: { id: 23 } });
    const view = mount(WorldStartPanel, () => ({ node: { ...node, type: 'SETTLEMENT' }, owner: 1, session: 1, writable: true }));
    await flushView();
    findView(view.root, n => n.tag === 'button' && viewText(n).includes('Начать здесь'))!.props.onClick(); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledWith('start', { city_id: 1 });
    expect(mocks.push).toHaveBeenCalledWith({ path: '/world/nodes/23', hash: '#map' });
  });
});
function storage(id: number): StorageView {
  return { storage: { id, kind: 'backpack', name: `Хранилище ${id}`, capacity: 3, revision: 1, node_id: 1, container_inventory_id: null }, items: id === 1 ? [{ id: 10, item_id: 2, name: 'Доска', icon: 'cube', quantity: 5, position: 1, revision: 1, instances: [], inner_storage_id: null }] : [], slots: [], container: null, location: null, total: id === 1 ? 1 : 0, pageSize: 100, pageCount: id === 1 ? 1 : 0, currentPage: 1, server_time: 1, writable: true };
}
async function mountStorage() {
  mocks.storageList.mockResolvedValue([storage(1).storage, storage(2).storage]);
  mocks.storage.mockImplementation(async id => storage(id));
  mocks.transfer.mockResolvedValue(quote);
  const session = ref(1), writable = ref(true);
  const view = mount(WorldStoragePanel, () => ({ nodeId: 1, storageId: 1, session: session.value, writable: writable.value, command: mocks.runner }));
  await flushView();
  const cell = (id: number, position: number) => findView(view.root, node => node.props['data-storage'] === id && node.props['data-position'] === position)!;
  return { ...view, session, writable, cell };
}
describe('direct storage controls', () => {
  it('moves cells before the request finishes and restores them on a rejected preview', async () => {
    const view = await mountStorage(), request = deferred<typeof quote>();
    mocks.transfer.mockReturnValue(request.promise);
    const firstCell = view.cell(1, 1);
    firstCell.props.onClick(); await flushView(); view.cell(2, 2).props.onClick(); await flushView();
    expect(viewText(view.cell(1, 1))).not.toContain('Доска');
    expect(viewText(view.cell(2, 2))).toContain('Доска');
    expect(view.cell(1, 1)).toBe(firstCell);
    // A definite refusal rolls back without remounting the grid.
    mocks.runner.submit.mockImplementation(async () => { mocks.runner.error.value = 'Отказ сервера'; });
    request.resolve(quote); await flushView();
    expect(viewText(view.cell(1, 1))).toContain('Доска');
    expect(viewText(view.cell(2, 2))).not.toContain('Доска');
    expect(view.cell(1, 1)).toBe(firstCell);
  });
  it('transfers by selecting an item and its cell, blocks repeated clicks during the quote', async () => {
    const view = await mountStorage(), pending = deferred<typeof quote>(); mocks.transfer.mockReturnValue(pending.promise);
    view.cell(1, 1).props.onClick(); await flushView();
    view.cell(2, 2).props.onClick(); view.cell(2, 2).props.onClick(); await flushView();
    expect(mocks.transfer).toHaveBeenCalledTimes(1);
    expect(mocks.transfer).toHaveBeenCalledWith({ inventory_id: 10, source_storage_id: 1, destination_storage_id: 2, position: 2, quantity: 5, instance_id: null });
    pending.resolve(quote); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledTimes(1);
    expect(mocks.runner.submit.mock.calls[0][0]).toBe('/storage/transfer');
  });
  it('drops onto the highlighted cell and ignores the synthetic click after dragging', async () => {
    const view = await mountStorage(), source = view.cell(1, 1);
    vi.stubGlobal('document', { elementFromPoint: () => ({ closest: () => ({ dataset: { storage: '2', position: '3', drop: 'true' } }) }) });
    const event = (x: number) => ({ button: 0, pointerId: 1, clientX: x, clientY: 0, currentTarget: source });
    source.props.onPointerdown(event(0)); source.props.onPointermove(event(20)); await flushView();
    source.props.onPointerup(event(20)); source.props.onClick(); await flushView();
    expect(mocks.transfer).toHaveBeenCalledTimes(1);
    expect(mocks.transfer.mock.calls[0][0].position).toBe(3);
    expect(mocks.runner.submit).toHaveBeenCalledTimes(1);
  });
  it('never submits an old transfer after switching sessions or disabling writes', async () => {
    for (const change of ['session', 'writable'] as const) {
      const view = await mountStorage(), pending = deferred<typeof quote>(); mocks.transfer.mockReturnValue(pending.promise);
      view.cell(1, 1).props.onClick(); await flushView(); view.cell(2, 1).props.onClick(); await flushView();
      if (change === 'session') view.session.value++; else view.writable.value = false;
      await flushView(); pending.resolve(quote); await flushView();
      expect(mocks.runner.submit).not.toHaveBeenCalled(); view.app.unmount();
    }
  });
  it('retains selection and shows an error when a transfer preview fails', async () => {
    const view = await mountStorage(); mocks.transfer.mockRejectedValue(new Error('offline'));
    view.cell(1, 1).props.onClick(); await flushView(); view.cell(2, 2).props.onClick(); await flushView();
    expect(viewText(view.root)).toContain('Ошибка запроса');
    expect(view.cell(1, 1).props['aria-pressed']).toBe(true);
    expect(mocks.runner.submit).not.toHaveBeenCalled();
  });
});
describe('one-click crafting', () => {
  function workspace(id = 1) { return { node_id: id, name: 'Усадьба', writable: true, server_time: 1, recipe_id: 2, recipes: [{ id: 2, name: 'Доска', icon: 'cube', quantity: 2, available: true, locked_reasons: [], availability_reasons: [] }], equipment: [], storages: [{ ...storage(1).storage, output_allowed: true }] }; }
  const terms = { price: '5.0000', experience: 10, reasons: [], materials: [{ item_id: 1, name: 'Бревно', have: 10, quantity: 2, available: true }], equipment: [], output: { item_id: 2, name: 'Доска', quantity: 2, storage_id: 1, fits: true } };
  async function setup() {
    vi.useFakeTimers(); mocks.workspace.mockResolvedValue(workspace()); mocks.preview.mockResolvedValue({ quote, terms });
    const view = mount(WorldWorkspace); await flushView(); await vi.advanceTimersByTimeAsync(600); await flushView();
    const button = () => findView(view.root, node => node.tag === 'button' && viewText(node).includes('Изготовить ·'))!;
    return { ...view, button };
  }
  it('calculates on selection and crafts once with the visible price', async () => {
    const view = await setup(); expect(viewText(view.button())).toContain('5 Cr');
    const pending = deferred<any>(); mocks.preview.mockReturnValue(pending.promise);
    view.button().props.onClick(); view.button().props.onClick(); await flushView();
    expect(mocks.preview).toHaveBeenCalledTimes(2); pending.resolve({ quote, terms }); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledTimes(1);
    expect(mocks.runner.submit.mock.calls[0][1]).toMatchObject({ recipe_id: 2, quantity: 1, output_storage_id: 1 });
  });
  it('shows a changed price without charging it silently', async () => {
    const view = await setup(); mocks.preview.mockResolvedValue({ quote, terms: { ...terms, price: '7.0000' } });
    view.button().props.onClick(); await flushView();
    expect(mocks.runner.submit).not.toHaveBeenCalled(); expect(viewText(view.root)).toContain('Условия изготовления изменились');
    expect(viewText(view.button())).toContain('7 Cr');
  });
  it('cancels an old automatic preview when navigating to another workshop', async () => {
    const view = await setup(), pending = deferred<any>(); mocks.preview.mockReturnValueOnce(pending.promise);
    view.button().props.onClick(); await flushView(); mocks.route.params.id = '3'; await flushView();
    pending.resolve({ quote, terms }); await flushView(); expect(mocks.runner.submit).not.toHaveBeenCalled();
  });
  it('sends only the final quantity after repeated edits within the debounce period', async () => {
    const view = await setup(); mocks.preview.mockClear();
    const quantityInput = () => findView(view.root, element => element.tag === 'input' && element.props.max === 100)!;
    for (const value of [2, 3, 4, 5]) {
      quantityInput().props['onUpdate:value'](value); await flushView();
      await vi.advanceTimersByTimeAsync(250);
      expect(mocks.preview).not.toHaveBeenCalled();
    }
    await vi.advanceTimersByTimeAsync(350); await flushView();
    expect(mocks.preview).toHaveBeenCalledTimes(1);
    expect(mocks.preview.mock.calls[0][0].quantity).toBe(5);
  });
  it('cancels a scheduled quantity calculation when the workshop closes', async () => {
    const view = await setup(); mocks.preview.mockClear();
    findView(view.root, element => element.tag === 'input' && element.props.max === 100)!.props['onUpdate:value'](3);
    view.app.unmount(); await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.preview).not.toHaveBeenCalled();
  });
});
describe('map controls', () => {
  it('ignores profession data from a previous session even on the same map', async () => {
    const session = ref(1), selection = ref([{ x: 1, y: 0 }]), old = deferred<any>();
    mocks.explorer.mockReturnValueOnce(old.promise);
    const view = mount(WorldMap, () => ({ node, session: session.value, selection: selection.value, writable: true, command: mocks.runner, map: { node_id: 1, items: [], cells: [], can_expand: true, exploration: { allowed: true, level: 0, elixir_quantity: 0 } } }));
    await flushView(); session.value = 2; await flushView(); selection.value = [{ x: 2, y: 0 }]; await flushView();
    old.resolve({ id: 5, enrolled: false, level: 1, xp: 0, next: null }); await flushView();
    expect(mocks.explorer).toHaveBeenCalledTimes(2);
    expect(findView(view.root, n => n.tag === 'button' && viewText(n).includes('Открыть профессию'))).toBeUndefined();
  });
  it('distinguishes locked beds from available beds and shows how to open them', async () => {
    const open = { ...node, id: 2, type: 'BED', label: 'Грядка 1', details: { unlocked: 1 } };
    const closed = { ...node, id: 3, type: 'BED', label: 'Грядка 2', coordinates: { x: 1, y: 0 }, details: { unlocked: 0 } };
    const view = mount(WorldMap, () => ({ node, map: { node_id: 1, items: [open, closed], cells: [], can_expand: false }, writable: true, command: mocks.runner, selection: [closed.coordinates], session: 1 }));
    await flushView();
    const objects = findView(view.root, element => element.tag === 'g' && element.props['aria-label']?.includes('Грядка 2'))!;
    expect(objects.props.class).toContain('locked');
    expect(viewText(view.root)).toContain('Открытие ячеек');
    expect(findView(view.root, n => n.tag === 'button' && n.props['aria-label'] === 'Исследование и покупка ячеек')).toBeDefined();
  });
  it('buys only the selected nonconsecutive garden cells with one discounted command', async () => {
    const beds = Array.from({ length: 10 }, (_, i) => ({ node_id: 11 + i, ordinal: i + 1, unlocked: i === 0, price: `${i * 10}.0000` }));
    const children = beds.map((b, i) => ({ ...node, id: b.node_id, type: 'BED', details: { unlocked: b.unlocked ? 1 : 0 }, coordinates: { x: i, y: 0 } }));
    mocks.garden.mockResolvedValue({ garden: { node_id: 1, beds, unlocked: 1, available_budget: '0.0000' }, can_expand: true });
    mocks.gardenPreview.mockResolvedValue({ payment: { total: '142.5000' }, quote });
    const view = mount(WorldMap, () => ({ node: { ...node, extensions: ['garden'], details: { plot_kind: 'garden' } }, session: 1, writable: true, command: mocks.runner, selection: [children[1].coordinates, children[5].coordinates, children[9].coordinates], map: { node_id: 1, items: children, cells: [], can_expand: false } }));
    await flushView(); const buy = findView(view.root, n => n.tag === 'button' && viewText(n).includes('Купить 3'))!;
    expect(viewText(buy)).toContain('142.5 Cr'); expect(buy.props.disabled).toBe(false);
    buy.props.onClick(); await flushView();
    const input = { quantity: 3, bed_ids: [12, 16, 20], top_up: true };
    expect(mocks.gardenPreview).toHaveBeenCalledWith(1, 'expand', input);
    expect(mocks.runner.submit).toHaveBeenCalledWith('/nodes/1/garden-expand', input, quote);
  });
  it('ignores a garden preview after the selected cells change', async () => {
    const selection = ref([{ x: 1, y: 0 }]), response = deferred<any>();
    mocks.garden.mockResolvedValue({ garden: { beds: [{ node_id: 12, unlocked: false, price: '10.0000' }] }, can_expand: true });
    mocks.gardenPreview.mockReturnValue(response.promise);
    const child = { ...node, id: 12, type: 'BED', details: { unlocked: 0 }, coordinates: selection.value[0] };
    const view = mount(WorldMap, () => ({ node: { ...node, extensions: ['garden'], details: { plot_kind: 'garden' } }, session: 1, writable: true, command: mocks.runner, selection: selection.value, map: { node_id: 1, items: [child], cells: [], can_expand: false } }));
    await flushView(); findView(view.root, n => n.tag === 'button' && viewText(n).includes('Купить 1'))!.props.onClick();
    selection.value = []; await flushView(); response.resolve({ payment: { total: '10.0000' }, quote }); await flushView();
    expect(mocks.runner.submit).not.toHaveBeenCalled();
  });
  it('researches a batch and requires enough elixirs for every cell above the current level', async () => {
    const elixirs = ref(1), selection = [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: -2, y: 0 }];
    mocks.mapPreview.mockResolvedValue({ ...quote, terms: { price: '0.0000', elixir_quantity: 2 } });
    const view = mount(WorldMap, () => ({ node, session: 1, writable: true, command: mocks.runner, selection, map: { node_id: 1, items: [], cells: [], can_expand: true, exploration: { allowed: true, level: 1, elixir_quantity: elixirs.value } } }));
    await flushView(); const research = () => findView(view.root, n => n.tag === 'button' && viewText(n).includes('Исследовать 3'))!;
    expect(research().props.disabled).toBe(true); elixirs.value = 2; await flushView(); expect(research().props.disabled).toBe(false);
    research().props.onClick(); await flushView();
    expect(mocks.mapPreview).toHaveBeenCalledWith(1, 'explore', { cells: selection, top_up: false, use_elixir: true });
    expect(mocks.runner.submit).toHaveBeenCalledOnce();
  });
  it.each(['WORLD', 'REGION', 'SETTLEMENT', 'BUILDING', 'ROOM', 'PLOT', 'BED', 'CHEST', 'PLACE'] as const)('uses common research controls for $0 objects, including a built garden', async type => {
    const selection = [{ x: 1, y: 0 }];
    mocks.mapPreview.mockResolvedValue({ ...quote, terms: { price: '0.0000' } });
    const view = mount(WorldMap, () => ({ node: { ...node, type, details: type === 'PLOT' ? { plot_kind: 'garden' } : {} }, session: 1, writable: true, command: mocks.runner, selection,
      map: { node_id: 1, items: [], cells: [], can_expand: true, exploration: { allowed: true, level: 3, elixir_quantity: 0 } } }));
    await flushView();
    expect(mocks.garden).not.toHaveBeenCalled();
    const button = findView(view.root, n => n.tag === 'button' && viewText(n).includes('Исследовать 1'))!;
    expect(button.props.disabled).toBe(false); button.props.onClick(); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledWith('/nodes/1/map-explore', { cells: selection, top_up: false, use_elixir: false }, expect.any(Object));
  });
  it.each([{ level: 0, elixirs: 1, useElixir: true }, { level: 3, elixirs: 1, useElixir: false }])('automatically chooses the exploration resource: $level / $elixirs', async ({ level, elixirs, useElixir }) => {
    const selection = ref([{ x: 2, y: 0 }]);
    const preview = { ...quote, terms: { price: '0.0000', use_elixir: useElixir } };
    mocks.mapPreview.mockResolvedValue(preview);
    const view = mount(WorldMap, () => ({ node, session: 1, writable: true, command: mocks.runner, selection: selection.value, map: {
      node_id: 1, items: [], cells: [], can_expand: true, bounds: { x: -2, y: -2, width: 5, height: 5 }, exploration: { allowed: true, level, elixir_quantity: elixirs, max_level_per_node: 3, reason: '' },
    } }));
    await flushView();
    const button = findView(view.root, element => element.tag === 'button' && viewText(element).includes('Исследовать'))!;
    expect(button.props.disabled).toBe(false);
    button.props.onClick(); await flushView();
    const input = { cells: [{ x: 2, y: 0 }], top_up: false, use_elixir: useElixir };
    expect(mocks.mapPreview).toHaveBeenCalledWith(1, 'explore', input);
    expect(mocks.runner.submit).toHaveBeenCalledWith('/nodes/1/map-explore', input, preview);
  });
  it('keeps exploration unavailable without the required level or an elixir', async () => {
    const view = mount(WorldMap, () => ({ node, writable: true, command: mocks.runner, selection: [{ x: 2, y: 0 }], map: {
      node_id: 1, items: [], cells: [], can_expand: true, exploration: { allowed: true, level: 1, elixir_quantity: 0, max_level_per_node: 3, reason: '' },
    } }));
    await flushView();
    const button = findView(view.root, element => element.tag === 'button' && viewText(element).includes('Исследовать'))!;
    expect(button.props.disabled).toBe(true);
    button.props.onClick(); await flushView();
    expect(mocks.mapPreview).not.toHaveBeenCalled();
  });
  it('selects only unoccupied cells of the same state and suppresses its final click', async () => {
    const selection = ref<any[]>([]);
    const cells = [{ x: 0, y: 0, state: 'discovered' }, { x: 1, y: 0, state: 'discovered' }, { x: 0, y: 1, state: 'open' }];
    const view = mount(WorldMap, () => ({ node, writable: true, command: mocks.runner, selection: selection.value, 'onUpdate:selection': (value: any) => { selection.value = value; }, map: { node_id: 1, items: [{ ...node, id: 2, coordinates: { x: 0, y: 1 } }], can_expand: true, bounds: { x: 0, y: 0, width: 2, height: 2 }, cells } }));
    const svg = findView(view.root, node => node.tag === 'svg')!;
    const screen = { setPointerCapture() {}, getScreenCTM: () => ({ inverse: () => ({}) }), createSVGPoint: () => ({ x: 0, y: 0, matrixTransform() { return { x: this.x, y: this.y }; } }) };
    const event = (x: number, y: number) => ({ button: 0, pointerId: 1, clientX: x, clientY: y, currentTarget: screen, target: { closest: () => null } });
    svg.props.onPointerdown(event(1, 1)); svg.props.onPointermove(event(175, 175)); svg.props.onPointerup(); svg.props.onClick(event(175, 175)); await flushView();
    expect(selection.value).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }]);
    svg.props.onKeydown({ key: 'Escape' }); await flushView(); expect(selection.value).toEqual([]);
  });
  it('allows selection in read-only mode and never buys at a changed price', async () => {
    const writable = ref(false), selection = ref([{ x: 0, y: 0 }]);
    const view = mount(WorldMap, () => ({ node, writable: writable.value, command: mocks.runner, selection: selection.value, 'onUpdate:selection': (value: any) => { selection.value = value; }, map: { node_id: 1, items: [], can_expand: true, bounds: { x: 0, y: 0, width: 2, height: 1 }, cells: [{ x: 0, y: 0, state: 'discovered' }, { x: 1, y: 0, state: 'discovered' }], pricing: { paid_cells: 0, base_price: '10.0000', next_price: '10.0000', bulk_minimum: 3, discount_bps: 500, max_quantity: 100, currency: 'Cr' } } }));
    const svg = findView(view.root, node => node.tag === 'svg')!;
    svg.props.onKeydown({ key: 'ArrowRight', preventDefault() {} }); await flushView(); expect(selection.value).toEqual([{ x: 1, y: 0 }]);
    writable.value = true; await flushView(); mocks.mapPreview.mockResolvedValue({ ...quote, terms: { price: '11.0000' } });
    const buy = findView(view.root, node => node.tag === 'button' && viewText(node).includes('Купить 1'))!;
    buy.props.onClick(); await flushView(); expect(mocks.runner.submit).not.toHaveBeenCalled(); expect(viewText(view.root)).toContain('Цена изменилась');
  });
});
describe('one-click world actions', () => {
  const props = () => ({ nodeId: 1, bedId: 1, session: 1, writable: true, command: mocks.runner });
  it('keeps garden loading errors visible and allows retry even in existing-only mode', async () => {
    mocks.garden.mockRejectedValueOnce(new Error('load failed')).mockResolvedValueOnce({ garden: null, offer: null });
    const view = mount(WorldGardenPanel, () => ({ ...props(), existingOnly: true })); await flushView();
    expect(findView(view.root, n => n.props.role === 'alert')).toBeDefined();
    findView(view.root, n => n.tag === 'button' && viewText(n).includes('Обновить огород'))!.props.onClick(); await flushView();
    expect(mocks.garden).toHaveBeenCalledTimes(2);
  });
  it('explains insufficient garden budget and opens with explicit personal top-up', async () => {
    const beds = Array.from({ length: 10 }, (_, i) => ({ node_id: i + 11, ordinal: i + 1, unlocked: i === 0, price: `${i * 10}.0000` }));
    mocks.garden.mockResolvedValue({ garden: { node_id: 1, unlocked: 1, beds, available_budget: '1.8000', base_price: '10.0000' }, can_expand: true });
    mocks.gardenPreview.mockResolvedValue({ input: { quantity: 1, top_up: true }, payment: { total: '10.0000' }, quote });
    const view = mount(WorldGardenPanel, () => ({ ...props(), existingOnly: true })); await flushView();
    const unlock = () => findView(view.root, n => n.tag === 'button' && viewText(n).includes('Открыть 1'))!;
    expect(unlock().props.disabled).toBe(true);
    expect(viewText(view.root)).toContain('В бюджете огорода недостаточно средств');
    expect(findView(view.root, n => n.tag === 'a' && n.props.to === '/world/nodes/1#finance')).toBeDefined();
    findView(view.root, n => typeof n.props['onUpdate:checked'] === 'function')!.props['onUpdate:checked'](true); await flushView();
    expect(unlock().props.disabled).toBe(false);
    unlock().props.onClick(); await flushView();
    expect(mocks.gardenPreview).toHaveBeenCalledWith(1, 'expand', { top_up: true, quantity: 1 });
    expect(mocks.runner.submit).toHaveBeenCalledWith('/nodes/1/garden-expand', { top_up: true, quantity: 1 }, quote);
  });
  it('buys the garden at its displayed price and rejects a changed offer', async () => {
    mocks.garden.mockResolvedValue({ garden: null, offer: { id: 1, name: 'Огород', price: '50.0000', base_price: '10.0000', can_afford: true }, can_buy: true, can_publish: false, site_budget_available: '100.0000', settlement_name: 'Поселение' });
    for (const price of ['51.0000', '50.0000']) {
      mocks.gardenPreview.mockResolvedValue({ action: 'buy', payment: { total: price }, input: { top_up: false }, quote });
      const view = mount(WorldGardenPanel, props); await flushView();
      findView(view.root, node => node.tag === 'button' && viewText(node).includes('Купить огород'))!.props.onClick(); await flushView();
      if (price === '51.0000') { expect(mocks.runner.submit).not.toHaveBeenCalled(); expect(viewText(view.root)).toContain('Цена изменилась'); }
      else expect(mocks.runner.submit).toHaveBeenCalledWith('/nodes/1/garden-buy', { top_up: false }, quote);
      view.app.unmount();
    }
  });
  it('buys an equipment place directly using the selected quantity and exact price', async () => {
    mocks.equipment.mockResolvedValue({ writable: true, supported: true, available: '100.0000', expansion: { unlocked: 1, initial: 1, limit: 3, storageId: 2, places: [{ position: 1, unlocked: true, price: '0.0000' }, { position: 2, unlocked: false, price: '10.0000' }, { position: 3, unlocked: false, price: '12.0000' }] } });
    mocks.equipmentPreview.mockResolvedValue({ payment: { total: '10.0000' }, input: { quantity: 1, top_up: false }, quote });
    const view = mount(WorldEquipmentExpansionPanel, props); await flushView();
    const button = findView(view.root, node => node.tag === 'button' && viewText(node).includes('Открыть 1'))!;
    expect(viewText(button)).toContain('10 Cr'); button.props.onClick(); button.props.onClick(); await flushView();
    expect(mocks.equipmentPreview).toHaveBeenCalledTimes(1); expect(mocks.runner.submit).toHaveBeenCalledTimes(1);
  });
  it('prepares cultivation costs automatically and digs in one click', async () => {
    mocks.cultivation.mockResolvedValue({ bed_id: 1, dug: false, writable: true, cycle: null, server_time: Math.floor(Date.now() / 1000) });
    mocks.crops.mockResolvedValue({ items: [], pageCount: 0 }); mocks.cultivationPreview.mockResolvedValue(quote);
    const view = mount(WorldCultivationPanel, props); await flushView();
    expect(mocks.cultivationPreview).toHaveBeenCalledWith(1, 'dig', {});
    const button = findView(view.root, node => node.tag === 'button' && viewText(node).includes('Вскопать'))!;
    expect(button.props.disabled).toBe(false); button.props.onClick(); button.props.onClick(); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledTimes(1);
    expect(mocks.runner.submit).toHaveBeenCalledWith('/beds/1/dig', {}, quote);
    expect(findView(view.root, node => node.tag === 'button' && viewText(node).includes('Вскопать'))!.props.disabled).toBe(false);
  });
  it('collects supplies without an intermediate confirmation', async () => {
    mocks.supplies.mockResolvedValue({ starterAvailable: false, gatherAvailable: true, gatherAvailableAt: 99999999 });
    mocks.suppliesPreview.mockResolvedValue({ quote, efficiency: 10000, items: [{ id: 1, name: 'Бревно', quantity: 3 }] });
    const view = mount(WorldCampsiteSupplies, props); await flushView();
    const button = findView(view.root, node => node.tag === 'button' && viewText(node).includes('Собрать материалы'))!;
    button.props.onClick(); button.props.onClick(); await flushView();
    expect(mocks.suppliesPreview).toHaveBeenCalledTimes(1);
    expect(mocks.runner.submit).toHaveBeenCalledWith('/nodes/1/supplies-gather', {}, quote);
  });
  it('waits for the shared command to finish before enabling sowing', async () => {
    mocks.runner.busy.value = true;
    mocks.cultivation.mockResolvedValue({ bed_id: 1, dug: true, writable: true, cycle: null, server_time: Math.floor(Date.now() / 1000) });
    mocks.crops.mockResolvedValue({ items: [{ id: 7, name: 'Морковь', seed_quantity: 1, yield_quantity: 4, grow_seconds: 300 }], pageCount: 1 });
    mocks.cultivationPreview.mockResolvedValue(quote);
    const view = mount(WorldCultivationPanel, props); await flushView();
    expect(mocks.cultivationPreview).not.toHaveBeenCalled();
    mocks.runner.busy.value = false; await flushView();
    expect(mocks.cultivationPreview).toHaveBeenCalledWith(1, 'sow', { crop_revision_id: 7 });
    expect(findView(view.root, n => n.tag === 'button' && viewText(n) === 'Посадить семена')!.props.disabled).toBe(false);
    expect(mocks.runner.submit).not.toHaveBeenCalled();
  });
  it('plants a dropped crop after loading a newly selected bed and handles repeated drops', async () => {
    const crop = ref({ id: 7, sequence: 1 });
    mocks.cultivation.mockResolvedValue({ bed_id: 1, dug: true, writable: true, cycle: null, server_time: Math.floor(Date.now() / 1000) });
    mocks.crops.mockResolvedValue({ items: [{ id: 7, name: 'Морковь', seed_quantity: 1, yield_quantity: 4, grow_seconds: 300 }], pageCount: 1 });
    mocks.cultivationPreview.mockResolvedValue(quote);
    mount(WorldCultivationPanel, () => ({ ...props(), droppedCrop: crop.value })); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledTimes(1);
    expect(mocks.runner.submit).toHaveBeenCalledWith('/beds/1/sow', { crop_revision_id: 7 }, quote);
    crop.value = { id: 7, sequence: 2 }; await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledTimes(2);
  });
  it('enables harvest automatically at ripening without refreshing the page', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(1000 * 1000));
    const growing = { bed_id: 1, dug: false, writable: true, server_time: 1000, cycle: { id: 1, name: 'Морковь', state: 'growing', ready_at: 1001, expires_at: 2000, water_due_at: null, water_deadline_at: null, can_water: false } };
    mocks.cultivation.mockResolvedValueOnce(growing).mockResolvedValue({ ...growing, server_time: 1001, cycle: { ...growing.cycle, state: 'ripe' } });
    mocks.crops.mockResolvedValue({ items: [], pageCount: 0 }); mocks.cultivationPreview.mockResolvedValue(quote);
    const view = mount(WorldCultivationPanel, props); await flushView();
    await vi.advanceTimersByTimeAsync(1000); await flushView();
    expect(mocks.cultivationPreview).toHaveBeenCalledWith(1, 'harvest', {});
    expect(findView(view.root, n => n.tag === 'button' && viewText(n).includes('Собрать урожай'))!.props.disabled).toBe(false);
    expect(mocks.runner.submit).not.toHaveBeenCalled();
  });
});

describe('garden harvest purchase controls', () => {
  it('separates movement from sale controls and withdraws to the selected storage', async () => {
    mocks.harvest.mockResolvedValue({ owned_by_me: true, writable: true, allow_sales: true, capacity: 5, server_time: 100, destinations: [{ id: 9, name: 'Рюкзак', kind: 'backpack' }, { id: 10, name: 'Склад', kind: 'stockpile' }], items: [{ inventory_id: 5, position: 1, name: 'Морковь', quantity: 7, price: '2.5000', fresh_until: 1209700, spoiled: true }] });
    const view = mount(WorldHarvestPanel, () => ({ nodeId: 10, session: 1, revision: 1, command: mocks.runner })); await flushView();
    findView(view.root, n => n.tag === 'button' && viewText(n).includes('Морковь'))!.props.onClick(); await flushView();
    const movement = findView(view.root, n => n.props['aria-label'] === 'Перемещение урожая')!;
    const sales = findView(view.root, n => n.props['aria-label'] === 'Продажа урожая')!;
    expect(viewText(movement)).not.toContain('цену'); expect(viewText(sales)).not.toContain('Переместить');
    findView(movement, n => n.tag === 'select')!.props['onUpdate:value'](10); await flushView();
    const input = { inventory_id: 5, quantity: 1, destination_storage_id: 10 };
    mocks.harvestPreview.mockResolvedValue({ input, quote: { ...quote, terms: { fits: true } } });
    findView(movement, n => n.tag === 'button')!.props.onClick(); await flushView();
    expect(mocks.harvestPreview).toHaveBeenCalledWith(10, 'withdraw', input);
    expect(mocks.runner.submit.mock.calls[0][1]).toEqual(input);
  });
  async function setup() {
    mocks.harvest.mockResolvedValue({ owned_by_me: false, writable: true, allow_sales: true, capacity: 5, server_time: 100, items: [{ inventory_id: 5, position: 2, name: 'Морковь', icon: 'seedling', quantity: 7, price: '2.5000', harvested_at: 100, fresh_until: 1209700, spoiled: true }] });
    const view = mount(WorldHarvestPanel, () => ({ nodeId: 10, session: 1, revision: 1, command: mocks.runner })); await flushView();
    findView(view.root, n => n.tag === 'button' && viewText(n).includes('Морковь'))!.props.onClick(); await flushView();
    return { ...view, buy: () => findView(view.root, n => n.tag === 'button' && viewText(n).includes('Купить'))! };
  }
  it('buys once at the displayed price and shows five storage cells', async () => {
    const view = await setup(), pending = deferred<any>(); mocks.harvestPreview.mockReturnValue(pending.promise);
    expect(viewText(view.buy())).toContain('2.5 Cr');
    view.buy().props.onClick(); view.buy().props.onClick(); await flushView();
    expect(mocks.harvestPreview).toHaveBeenCalledTimes(1);
    const input = { inventory_id: 5, quantity: 1 }, q = { ...quote, terms: { total: '2.5000', fits: true } };
    pending.resolve({ input, quote: q }); await flushView();
    expect(mocks.runner.submit).toHaveBeenCalledWith('/nodes/10/harvest-buy', input, q);
    expect(findView(view.root, n => n.props.class === 'harvest-grid')?.children.filter(n => n.tag === 'button')).toHaveLength(5);
    expect(viewText(view.root)).not.toContain('Свободно');
  });
  it('refreshes a changed price and keeps its explanation visible without paying', async () => {
    const view = await setup();
    mocks.harvestPreview.mockResolvedValue({ input: { inventory_id: 5, quantity: 1 }, quote: { ...quote, terms: { total: '3.0000', fits: true } } });
    view.buy().props.onClick(); await flushView();
    expect(mocks.runner.submit).not.toHaveBeenCalled();
    expect(viewText(view.root)).toContain('Цена изменилась');
  });
});

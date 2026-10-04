import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, reactive, ref } from 'vue';
import { clientView, findView, flushView, mountView, viewText } from './helpers/clientView';
import WorldMap from '../src/components/pages/world/WorldMap.vue';
import WorldStoragePanel from '../src/components/pages/world/WorldStoragePanel.vue';
import WorldStorageGrid from '../src/components/pages/world/WorldStorageGrid.vue';
import WorldWorkspace from '../src/components/pages/world/WorldWorkspace.vue';
import WorldGardenPanel from '../src/components/pages/world/WorldGardenPanel.vue';
import WorldEquipmentExpansionPanel from '../src/components/pages/world/WorldEquipmentExpansionPanel.vue';
import WorldCultivationPanel from '../src/components/pages/world/WorldCultivationPanel.vue';
import WorldCampsiteSupplies from '../src/components/pages/world/WorldCampsiteSupplies.vue';
import type { StorageView } from '../src/services/api/worldStorage';
import type { WorldNode } from '../src/entities/world/types';

const mocks = vi.hoisted(() => ({ storageList: vi.fn(), storage: vi.fn(), transfer: vi.fn(), workspace: vi.fn(), preview: vi.fn(), mapPreview: vi.fn(), garden: vi.fn(), gardenPreview: vi.fn(), equipment: vi.fn(), equipmentPreview: vi.fn(), cultivation: vi.fn(), crops: vi.fn(), cultivationPreview: vi.fn(), supplies: vi.fn(), suppliesPreview: vi.fn(), runner: null as any, route: null as any }));
vi.mock('naive-ui', () => {
  const block = (tag: string) => ({ setup: (_: unknown, { slots, attrs }: any) => () => h(tag, attrs, slots.default?.()) });
  return { NAlert: block('aside'), NButton: block('button'), NInputNumber: block('input'), NInput: block('input'), NSelect: block('select'), NSpin: block('span'), NCheckbox: block('input') };
});
vi.mock('vue-router', () => ({ useRoute: () => mocks.route }));
vi.mock('vuex', () => ({ useStore: () => ({ state: { auth: { revision: 1 } }, getters: { 'auth/user': { id: 1 } }, dispatch: vi.fn() }) }));
vi.mock('../src/hooks/useWorldCommand', () => ({ useWorldCommand: () => mocks.runner }));
vi.mock('../src/services/api/worldStorage', () => ({ loadStorageList: mocks.storageList, loadStorageContents: mocks.storage, previewTransfer: mocks.transfer }));
vi.mock('../src/services/api/worldWorkspace', () => ({ loadWorkspace: mocks.workspace, previewWorkspace: mocks.preview }));
vi.mock('../src/services/api/worldGarden', () => ({ loadGarden: mocks.garden, previewGarden: mocks.gardenPreview }));
vi.mock('../src/services/api/worldEquipmentExpansion', () => ({ loadEquipmentExpansion: mocks.equipment, previewEquipmentExpansion: mocks.equipmentPreview }));
vi.mock('../src/services/api/worldCultivation', () => ({ loadCultivation: mocks.cultivation, loadCrops: mocks.crops, previewCultivation: mocks.cultivationPreview }));
vi.mock('../src/services/api/worldCampsite', () => ({ loadCampsiteSupplies: mocks.supplies, previewCampsiteSupplies: mocks.suppliesPreview }));
vi.mock('../src/services/api/world', () => ({ loadExplorer: async () => null, previewProfession: vi.fn(), previewMapCells: mocks.mapPreview, worldError: () => 'Ошибка запроса' }));

clientView(WorldStorageGrid, 'components/pages/world/WorldStorageGrid.vue');
clientView(WorldStoragePanel, 'components/pages/world/WorldStoragePanel.vue');
clientView(WorldMap, 'components/pages/world/WorldMap.vue');
clientView(WorldWorkspace, 'components/pages/world/WorldWorkspace.vue');
clientView(WorldGardenPanel, 'components/pages/world/WorldGardenPanel.vue');
clientView(WorldEquipmentExpansionPanel, 'components/pages/world/WorldEquipmentExpansionPanel.vue');
clientView(WorldCultivationPanel, 'components/pages/world/WorldCultivationPanel.vue');
clientView(WorldCampsiteSupplies, 'components/pages/world/WorldCampsiteSupplies.vue');
const quote = { quote_id: 'a'.repeat(32), expected_revisions: {}, server_time: 1, expires_at: 99999999, terms: {} };
const node: WorldNode = { id: 1, type: 'PLOT', label: 'Усадьба', name: 'Усадьба', code: '', root_id: 1, parent_id: null, status: 'active', visibility: 'private', revision: 1, portable: false, coordinates: { x: 0, y: 0 }, child_count: 0, descendant_count: 0, population_total: 0, owned_by_me: true, footprint: null, details: {}, permissions: { administer: false, manage: true, storage: true }, actions: [] };
let apps: { unmount: () => void }[] = [];
function mount(component: any, props?: () => Record<string, unknown>) { const result = mountView(component, props); apps.push(result.app); return result; }
beforeEach(() => {
  vi.resetAllMocks();
  mocks.runner = { busy: ref(false), pending: ref(null), error: ref(''), submit: vi.fn().mockResolvedValue(undefined), retry: vi.fn() };
  mocks.route = reactive({ params: { id: '1' }, query: {} });
});
afterEach(() => { apps.forEach(app => app.unmount()); apps = []; vi.useRealTimers(); vi.unstubAllGlobals(); });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
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
    const view = mount(WorldWorkspace); await flushView(); await vi.advanceTimersByTimeAsync(300); await flushView();
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
});
describe('map controls', () => {
  it('selects a rectangle and suppresses its click instead of collapsing the selection', async () => {
    const selection = ref<any[]>([]);
    const cells = [{ x: 0, y: 0, state: 'discovered' }, { x: 1, y: 0, state: 'discovered' }, { x: 0, y: 1, state: 'open' }];
    const view = mount(WorldMap, () => ({ node, writable: true, command: mocks.runner, selection: selection.value, 'onUpdate:selection': (value: any) => { selection.value = value; }, map: { node_id: 1, items: [{ ...node, id: 2, coordinates: { x: 0, y: 1 } }], can_expand: true, bounds: { x: 0, y: 0, width: 2, height: 2 }, cells } }));
    const svg = findView(view.root, node => node.tag === 'svg')!;
    const screen = { setPointerCapture() {}, getScreenCTM: () => ({ inverse: () => ({}) }), createSVGPoint: () => ({ x: 0, y: 0, matrixTransform() { return { x: this.x, y: this.y }; } }) };
    const event = (x: number, y: number) => ({ button: 0, pointerId: 1, clientX: x, clientY: y, currentTarget: screen, target: { closest: () => null } });
    svg.props.onPointerdown(event(1, 1)); svg.props.onPointermove(event(175, 175)); svg.props.onPointerup(); svg.props.onClick(event(175, 175)); await flushView();
    expect(selection.value).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }]);
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

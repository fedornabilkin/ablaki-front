import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { setup as setupSsrStyles } from '@css-render/vue3-ssr';
import { describe, expect, it } from 'vitest';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { createRequire } from 'node:module';
import CraftRecipeDetail from '../src/components/pages/craft/CraftRecipeDetail.vue';
import CraftRoadmap from '../src/components/pages/craft/CraftRoadmap.vue';
import CraftInventory from '../src/components/pages/craft/CraftInventory.vue';
import type { CraftState } from '../src/services/api/classicCraft';
// The server renderer uses Font Awesome's CommonJS entry, separate from Vite's browser library.
const require = createRequire(import.meta.url);
require('@fortawesome/fontawesome-svg-core').library.add(require('@fortawesome/free-solid-svg-icons').fas);
const state: CraftState = {
  items: [1, 2].map(id => ({id, code: `item-${id}`, name: id === 1 ? 'Бревно' : 'Доска', description: '', category_id: 1, kind: 'material', rarity: 'common', icon: 'cube', stack_size: 100, destroyable: 1, active: 1, use_xp: 0, gather_quantity: 0})),
  recipes: [{id: 1, code: 'plank', name: 'Создать: Доска', description: '', category_id: 1, item_id: 2, station_id: null, output_quantity: 2, cost_credits: 5, experience: 10, min_level: 1, crafted: 0, ingredients: [{item_id: 1, quantity: 2}], tools: [], requires: [], locked_reasons: []}],
  categories: [{id: 1, name: 'Дерево', code: 'wood', description: 'Обработка дерева'}], stations: [], skills: [], inventory: [{item_id: 1, quantity: 4}], inventory_slots: [{id: 10, item_id: 1, quantity: 4}], credit: 0, charge_credits: false, starter_available: false, gather_available: true, slot_limit: 100, slots_used: 1,
};
async function detail(value: CraftState) {
  const app = createSSRApp(CraftRecipeDetail, {state: value, recipe: value.recipes[0], busy: false, blocked: false});
  app.component('font-awesome-icon', FontAwesomeIcon);
  setupSsrStyles(app);
  return renderToString(app);
}
describe('craft view with server state', () => {
  it('renders separate real stacks and all empty cells without per-item delete buttons', async () => {
    const inventory = {...state, inventory: [{item_id: 1, quantity: 104}], inventory_slots: [{id: 10, item_id: 1, quantity: 100}, {id: 11, item_id: 1, quantity: 4}], slots_used: 2};
    const app = createSSRApp(CraftInventory, {state: inventory, blocked: false});
    app.component('font-awesome-icon', FontAwesomeIcon);
    setupSsrStyles(app);
    const html = await renderToString(app);
    expect(html.match(/role="listitem"/g)).toHaveLength(101);
    expect(html).toContain('Бревно: 100 шт.'); expect(html).toContain('Бревно: 4 шт.');
    expect(html.match(/class="empty-slot"/g)).toHaveLength(98);
    expect(html).toContain('trash-cell'); expect(html).toContain('title="Корзина"');
    expect(html).not.toContain('Перетащите сюда'); expect(html).not.toContain('discard-button');
  });
  it('keeps all 100 occupied slots accessible alongside the basket', async () => {
    const inventory_slots = Array.from({length: 100}, (_, index) => ({id: index + 1, item_id: 1, quantity: index + 1}));
    const app = createSSRApp(CraftInventory, {state: {...state, inventory_slots, slots_used: 100}, blocked: false});
    app.component('font-awesome-icon', FontAwesomeIcon); setupSsrStyles(app);
    const html = await renderToString(app);
    expect(html.match(/role="listitem"/g)).toHaveLength(101);
    expect(html).toContain('Бревно: 100 шт.');
    expect(html).not.toContain('class="empty-slot"');
  });
  it('renders an enabled create button with no credits in free mode, and blocks paid mode', async () => {
    const free = await detail(state), paid = await detail({...state, charge_credits: true});
    const create = (html: string) => html.match(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*?Создать(?:(?!<\/button>)[\s\S])*?<\/button>/)?.[0];
    expect(create(free)).toBeTruthy(); expect(create(free)).not.toMatch(/\sdisabled(?:=|[ >])/);
    expect(create(paid)).toMatch(/\sdisabled(?:=|[ >])/);
    expect(free).toContain('Без списания кредитов');
  });
  it('marks missing ingredients with an accessible warning and blocks crafting', async () => {
    const html = await detail({...state, inventory: []});
    expect(html).toContain('aria-label="Не хватает ресурса"');
    expect(html).toContain('Не хватает ресурсов');
    expect(html).toMatch(/\sdisabled(?:=|[ >])/);
  });
  it('renders actual recipe nodes with keyboard instructions and no scale toolbar', async () => {
    const app = createSSRApp(CraftRoadmap, {state, selected: 1, category: null, topInset: 200, rightInset: 350});
    app.component('font-awesome-icon', FontAwesomeIcon);
    const html = await renderToString(app);
    expect(html).toContain('Доска'); expect(html).toContain('рецепта');
    expect(html).toContain('aria-pressed="true"'); expect(html).not.toContain('К выбранному');
  });
  it('renders equipment icons on the right with missing equipment marked', async () => {
    const value = {...state, recipes: [{...state.recipes[0], tools: [1, 2], station_id: 3}], stations: [{id: 3, name: 'Верстак', item_id: 2}]};
    const app = createSSRApp(CraftRoadmap, {state: value, selected: 1, category: null, topInset: 150, rightInset: 350});
    app.component('font-awesome-icon', FontAwesomeIcon);
    const html = await renderToString(app);
    expect(html).toContain('Инструмент: Бревно — доступно');
    expect(html).toContain('Инструмент: Доска — отсутствует');
    expect(html).toContain('Станция: Верстак — отсутствует');
    expect(html.match(/class="(?=[^"]*\bequipment-badge\b)(?=[^"]*\bmissing\b)[^"]*"/g)).toHaveLength(2);
  });
});

import { createRenderer, h, nextTick, ref } from 'vue';
import * as Vue from 'vue';
import { readFileSync } from 'node:fs';
import { parse, compileScript } from '@vue/compiler-sfc';
import { compile } from '@vue/compiler-dom';
import pug from 'pug';
import { describe, expect, it, vi } from 'vitest';
import CraftInventory from '../src/components/pages/craft/CraftInventory.vue';
import CraftSlotGrid from '../src/components/pages/craft/CraftSlotGrid.vue';
import type { CraftState } from '../src/services/api/classicCraft';
// Vitest loads SFCs for SSR. Compile the same template for the in-memory client renderer.
const {descriptor} = parse(readFileSync(new URL('../src/components/pages/craft/CraftInventory.vue', import.meta.url), 'utf8'));
const bindings = compileScript(descriptor, {id: 'inventory-interaction'}).bindings;
const template = pug.render(descriptor.template!.content, {doctype: 'html'});
const {code} = compile(template, {mode: 'function', prefixIdentifiers: true, bindingMetadata: bindings});
const gridDescriptor = parse(readFileSync(new URL('../src/components/pages/craft/CraftSlotGrid.vue', import.meta.url), 'utf8')).descriptor;
const gridCode = compile(pug.render(gridDescriptor.template!.content, {doctype: 'html'}), {mode: 'function', prefixIdentifiers: true, bindingMetadata: compileScript(gridDescriptor, {id: 'grid-interaction'}).bindings}).code;
(CraftSlotGrid as any).render = new Function('Vue', gridCode)(Vue);
const ClientInventory = {...CraftInventory, render: new Function('Vue', code)(Vue)};
vi.mock('naive-ui', async () => {
  const {h} = await import('vue');
  return {
    NPopover: {inheritAttrs: false, setup: (_: unknown, {slots}: any) => () => slots.trigger?.()},
    NButton: {setup: (_: unknown, {slots, attrs}: any) => () => h('button', attrs, slots.default?.())},
    NInputNumber: {setup: (_: unknown, {attrs}: any) => () => h('input', attrs)},
    NModal: {props: ['show', 'positiveButtonProps'], setup: (props: any, {attrs, slots}: any) => () => props.show ? h('section', {'data-confirm': true}, [slots.default?.(), h('button', {'data-confirm-button': true, onClick: attrs.onPositiveClick}, 'confirm')]) : null},
  };
});
interface ElementNode { tag: string; props: Record<string, any>; children: ElementNode[]; parent: ElementNode | null; text?: string; setPointerCapture: () => void; getBoundingClientRect: () => {left: number; right: number; top: number; bottom: number} }
function element(tag: string): ElementNode { return {tag, props: {}, children: [], parent: null, setPointerCapture() {}, getBoundingClientRect: () => ({left: 300, right: 420, top: 600, bottom: 690})}; }
const renderer = createRenderer<ElementNode, ElementNode>({
  createElement: element, createText: text => ({...element('#text'), text}), createComment: () => element('#comment'),
  setText: (node, text) => { node.text = text; }, setElementText: (node, text) => { node.text = text; node.children = []; },
  patchProp: (node, key, _prev, value) => { node.props[key] = value; }, parentNode: node => node.parent,
  nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
  insert: (node, parent, anchor) => { if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1); node.parent = parent; const index = anchor ? parent.children.indexOf(anchor) : -1; if (index < 0) parent.children.push(node); else parent.children.splice(index, 0, node); },
  remove: node => { node.parent?.children.splice(node.parent.children.indexOf(node), 1); node.parent = null; },
});
function find(node: ElementNode, predicate: (node: ElementNode) => boolean): ElementNode | undefined {
  if (predicate(node)) return node;
  for (const child of node.children) { const found = find(child, predicate); if (found) return found; }
}
function mount(targetQuantity = 100, change?: (state: CraftState) => void) {
  const state: CraftState = {items: [{id: 5, code: 'log', name: 'Log', description: '', category_id: 1, kind: 'material', rarity: 'common', icon: 'cube', stack_size: 100, destroyable: 1, active: 1, use_xp: 0, gather_quantity: 0}], inventory: [{item_id: 5, quantity: 103}], inventory_slots: [{id: 7, item_id: 5, quantity: 100}, {id: 8, item_id: 5, quantity: 3}], recipes: [], categories: [], stations: [], skills: [], credit: 0, charge_credits: false, starter_available: false, gather_available: false, slot_limit: 100, slots_used: 2};
  const command = vi.fn(), submit = vi.fn(), blocked = ref(false), root = element('root');
  state.inventory_slots[0].quantity = targetQuantity;
  change?.(state);
  const app = renderer.createApp({setup: () => () => h(ClientInventory, {state, blocked: blocked.value, onCommand: command, onSubmit: submit})});
  app.provide(Vue.ssrContextKey, {modules: new Set()});
  app.component('font-awesome-icon', {render: () => h('i')});
  app.mount(root);
  const slot = find(root, node => node.props['aria-label'] === 'Log: 3 шт.')!;
  const pointer = (x: number, y: number) => ({button: 0, pointerId: 1, clientX: x, clientY: y, currentTarget: slot});
  return {root, slot, app, command, submit, state, blocked, pointer};
}
describe('inventory drag to trash', () => {
  it('highlights matching items, exposes the selected chest and transfers back with the keyboard controls', async () => {
    const view = mount(90, state => {
      state.items.push({...state.items[0], id: 6, code: 'chest', name: 'Chest', storage_kind: 'chest', stack_size: 1});
      state.inventory_slots.push({id: 9, item_id: 6, quantity: 1, position: 3});
      state.containers = [{id: 9, capacity: 10, durability: 0, max_durability: 100, slots: [{id: 10, item_id: 5, quantity: 2, position: 1}]}];
    });
    view.slot.props.onClick({detail: 1}); await nextTick();
    const matching = find(view.root, n => n.props['aria-label'] === 'Log: 90 шт.')!;
    expect(matching.parent!.props.class).toContain('matching');
    find(view.root, n => n.props['aria-label'] === 'Chest: 1 шт.')!.props.onClick({detail: 1}); await nextTick();
    const contents = find(view.root, n => n.props['aria-label'] === 'Содержимое сундука')!;
    expect(contents).toBeTruthy();
    find(contents, n => n.props['aria-label'] === 'Log: 2 шт.')!.props.onClick({detail: 1}); await nextTick();
    const backpack = find(view.root, n => n.props['aria-label'] === 'Инвентарь: 10 на 5 слотов')!;
    find(backpack, n => n.props['aria-label'] === 'Пустой слот 4')!.props.onClick();
    expect(view.submit).toHaveBeenCalledExactlyOnceWith({action: 'transfer', id: 5, quantity: 2, slot_id: 10, container_id: 0, position: 4});
    view.app.unmount();
  });
  it('quotes the configured price and requires confirmation for permanent slot purchases', async () => {
    const view = mount(90, state => { state.credit = 100; state.permanent_slots = 20; state.active_slots = 20; state.inventory_settings = {slot_price: 10, elixir_slots: 5, elixir_days: 7, chest_slots: 10, chest_durability: 100, chest_wear: 1}; });
    find(view.root, n => n.props['aria-label'] === 'Открыть слот 21')!.props.onClick(); await nextTick();
    expect(view.submit).not.toHaveBeenCalled();
    find(view.root, n => !!n.props['data-confirm-button'])!.props.onClick();
    expect(view.submit).toHaveBeenCalledExactlyOnceWith({action: 'buy_slots', id: 0, quantity: 1, unit_price: 10}); view.app.unmount();
  });
  it('keeps trash in cell 51 and merges into a matching non-full stack by dragging', async () => {
    const view = mount(90);
    const basket = find(view.root, node => node.props.title === 'Корзина')!;
    expect(basket.parent!.props.class).toBe('trash-cell');
    const target = find(view.root, node => node.props['aria-label'] === 'Log: 90 шт.')!;
    target.parent!.getBoundingClientRect = () => ({left: 100, right: 180, top: 200, bottom: 280});
    view.slot.props.onPointerdown(view.pointer(10, 10));
    view.slot.props.onPointermove(view.pointer(140, 240)); await nextTick();
    expect(target.parent!.props.class).toContain('drop-target');
    view.slot.props.onPointerup(view.pointer(140, 240)); await nextTick();
    expect(view.submit).toHaveBeenCalledExactlyOnceWith({action: 'transfer', id: 5, quantity: 3, slot_id: 8, container_id: 0, position: 1});
    expect(find(view.root, n => !!n.props['data-confirm-button'])).toBeUndefined();
    view.app.unmount();
  });
  it('does not merge into a full stack', async () => {
    const view = mount();
    const target = find(view.root, node => node.props['aria-label'] === 'Log: 100 шт.')!;
    target.parent!.getBoundingClientRect = () => ({left: 100, right: 180, top: 200, bottom: 280});
    view.slot.props.onPointerdown(view.pointer(10, 10));
    view.slot.props.onPointermove(view.pointer(140, 240));
    view.slot.props.onPointerup(view.pointer(140, 240));
    expect(view.command).not.toHaveBeenCalled(); view.app.unmount();
  });
  it('requires confirmation and discards exactly the dragged stack, not its aggregate', async () => {
    const view = mount();
    const basket = find(view.root, node => node.props.title === 'Корзина')!;
    const basketParent = basket.parent, basketOrder = basket.parent!.props.class;
    view.slot.props.onPointerdown(view.pointer(10, 10));
    view.slot.props.onPointermove(view.pointer(350, 650));
    await nextTick();
    expect(find(view.root, node => node.props.title === 'Корзина')).toBe(basket);
    expect(basket.parent).toBe(basketParent); expect(basket.parent!.props.class).toBe(basketOrder);
    view.slot.props.onPointerup(view.pointer(350, 650));
    await nextTick();
    expect(view.command).not.toHaveBeenCalled();
    const confirm = find(view.root, n => !!n.props['data-confirm-button']);
    expect(confirm).toBeTruthy(); confirm!.props.onClick();
    expect(view.command).toHaveBeenCalledExactlyOnceWith('discard', 5, 3, 8);
    view.app.unmount();
  });
  it('opens item details alongside the grid on a slot click', async () => {
    const view = mount();
    view.slot.props.onClick({detail: 1}); await nextTick();
    const details = find(view.root, node => node.tag === 'aside');
    expect(details?.tag).toBe('aside');
    expect(details?.parent).toBe(find(view.root, node => node.props.class === 'craft-inventory'));
    expect(view.command).not.toHaveBeenCalled(); view.app.unmount();
  });
  it('does not delete on drop outside trash, pointer cancellation, or while blocked', async () => {
    const view = mount();
    view.slot.props.onPointerdown(view.pointer(10, 10)); view.slot.props.onPointermove(view.pointer(50, 50)); view.slot.props.onPointerup(view.pointer(50, 50));
    view.slot.props.onPointerdown(view.pointer(10, 10)); view.slot.props.onPointermove(view.pointer(350, 650)); view.slot.props.onPointercancel(); view.slot.props.onPointerup(view.pointer(350, 650));
    view.blocked.value = true; await nextTick();
    view.slot.props.onPointerdown(view.pointer(10, 10)); view.slot.props.onPointermove(view.pointer(350, 650)); view.slot.props.onPointerup(view.pointer(350, 650));
    await nextTick();
    expect(find(view.root, n => !!n.props['data-confirm-button'])).toBeUndefined();
    expect(view.command).not.toHaveBeenCalled(); view.app.unmount();
  });
});

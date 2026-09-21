import { createRenderer, h, nextTick, ref } from 'vue';
import * as Vue from 'vue';
import { readFileSync } from 'node:fs';
import { parse, compileScript } from '@vue/compiler-sfc';
import { compile } from '@vue/compiler-dom';
import pug from 'pug';
import { describe, expect, it, vi } from 'vitest';
import CraftInventory from '../src/components/pages/craft/CraftInventory.vue';
import type { CraftState } from '../src/services/api/classicCraft';
// Vitest loads SFCs for SSR. Compile the same template for the in-memory client renderer.
const {descriptor} = parse(readFileSync(new URL('../src/components/pages/craft/CraftInventory.vue', import.meta.url), 'utf8'));
const bindings = compileScript(descriptor, {id: 'inventory-interaction'}).bindings;
const template = pug.render(descriptor.template!.content, {doctype: 'html'});
const {code} = compile(template, {mode: 'function', prefixIdentifiers: true, bindingMetadata: bindings});
const ClientInventory = {...CraftInventory, render: new Function('Vue', code)(Vue)};
vi.mock('naive-ui', async () => {
  const {h} = await import('vue');
  return {
    NPopover: {setup: (_: unknown, {slots}: any) => () => slots.trigger?.()},
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
function mount() {
  const state: CraftState = {items: [{id: 5, code: 'log', name: 'Log', description: '', category_id: 1, kind: 'material', rarity: 'common', icon: 'cube', stack_size: 100, destroyable: 1, active: 1, use_xp: 0, gather_quantity: 0}], inventory: [{item_id: 5, quantity: 103}], inventory_slots: [{id: 7, item_id: 5, quantity: 100}, {id: 8, item_id: 5, quantity: 3}], recipes: [], categories: [], stations: [], skills: [], credit: 0, charge_credits: false, starter_available: false, gather_available: false, slot_limit: 100, slots_used: 2};
  const command = vi.fn(), blocked = ref(false), root = element('root');
  const app = renderer.createApp({setup: () => () => h(ClientInventory, {state, blocked: blocked.value, onCommand: command})});
  app.provide(Vue.ssrContextKey, {modules: new Set()});
  app.component('font-awesome-icon', {render: () => h('i')});
  app.mount(root);
  const slot = find(root, node => node.props['aria-label'] === 'Log: 3 шт.')!;
  const pointer = (x: number, y: number) => ({button: 0, pointerId: 1, clientX: x, clientY: y, currentTarget: slot});
  return {root, slot, app, command, blocked, pointer};
}
describe('inventory drag to trash', () => {
  it('requires confirmation and discards exactly the dragged stack, not its aggregate', async () => {
    const view = mount();
    const basket = find(view.root, node => node.props.title === 'Корзина')!;
    const basketParent = basket.parent, basketOrder = basket.parent!.props.style.order;
    view.slot.props.onPointerdown(view.pointer(10, 10));
    view.slot.props.onPointermove(view.pointer(350, 650));
    await nextTick();
    expect(find(view.root, node => node.props.title === 'Корзина')).toBe(basket);
    expect(basket.parent).toBe(basketParent); expect(basket.parent!.props.style.order).toBe(basketOrder);
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
    const details = find(view.root, node => node.props['aria-label'] === 'Описание предмета');
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

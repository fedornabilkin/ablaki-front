import { createRenderer, h, ssrContextKey, type Component } from 'vue';
import * as Vue from 'vue';
import { readFileSync } from 'node:fs';
import { parse, compileScript } from '@vue/compiler-sfc';
import { compile } from '@vue/compiler-dom';
import pug from 'pug';
import WorldCredits from '../../src/components/pages/world/WorldCredits.vue';
import WorldCountdown from '../../src/components/pages/world/WorldCountdown.vue';
import WorldQuotaNotice from '../../src/components/pages/world/WorldQuotaNotice.vue';

// Exercise the actual client template and its handlers without requiring a browser installation.
export function clientView(component: any, file: string) {
  const { descriptor } = parse(readFileSync(new URL(`../../src/${file}`, import.meta.url), 'utf8'));
  const bindings = compileScript(descriptor, { id: file }).bindings;
  const { code } = compile(pug.render(descriptor.template!.content, { doctype: 'html' }), { mode: 'function', prefixIdentifiers: true, bindingMetadata: bindings });
  component.render = new Function('Vue', code)(Vue);
  return component;
}
// Shared display primitives must use their actual client templates in renderer tests too.
clientView(WorldCredits, 'components/pages/world/WorldCredits.vue');
clientView(WorldCountdown, 'components/pages/world/WorldCountdown.vue');
clientView(WorldQuotaNotice, 'components/pages/world/WorldQuotaNotice.vue');
export interface ViewNode { tag: string; props: Record<string, any>; style: Record<string, string>; children: ViewNode[]; parent: ViewNode | null; text?: string; setPointerCapture: (id: number) => void; getBoundingClientRect: () => { height: number } }
function element(tag: string): ViewNode { return { tag, props: {}, style: { display: '' }, children: [], parent: null, setPointerCapture() {}, getBoundingClientRect: () => ({ height: 0 }) }; }
const renderer = createRenderer<ViewNode, ViewNode>({
  createElement: element, createText: text => ({ ...element('#text'), text }), createComment: () => element('#comment'),
  setText: (node, text) => { node.text = text; }, setElementText: (node, text) => { node.text = text; node.children = []; },
  patchProp: (node, key, _prev, value) => { node.props[key] = value; }, parentNode: node => node.parent,
  nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
  insert: (node, parent, anchor) => { if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1); node.parent = parent; const index = anchor ? parent.children.indexOf(anchor) : -1; if (index < 0) parent.children.push(node); else parent.children.splice(index, 0, node); },
  remove: node => { node.parent?.children.splice(node.parent.children.indexOf(node), 1); node.parent = null; },
});
export function mountView(component: Component, props: () => Record<string, unknown> = () => ({})) {
  const root = element('root');
  const app = renderer.createApp({ setup: () => () => h(component, props()) });
  app.provide(ssrContextKey, { modules: new Set() });
  app.component('font-awesome-icon', { render: () => h('i') });
  app.component('router-link', { setup: (_, { attrs, slots }) => () => h('a', attrs, slots.default?.()) });
  app.mount(root);
  return { root, app };
}
export function findView(node: ViewNode, predicate: (node: ViewNode) => boolean): ViewNode | undefined {
  if (predicate(node)) return node;
  for (const child of node.children) { const found = findView(child, predicate); if (found) return found; }
}
export const viewText = (node: ViewNode): string => (node.text ?? '') + node.children.map(viewText).join(' ');
export async function flushView() { for (let i = 0; i < 12; i++) await Promise.resolve(); }

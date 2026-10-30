import { readFileSync } from 'node:fs';
import { parse, compileScript } from '@vue/compiler-sfc';
import { compile } from '@vue/compiler-dom';
import pug from 'pug';
import { expect, it } from 'vitest';

it('compiles the five-game lobby template to executable browser JavaScript', () => {
  const { descriptor } = parse(readFileSync(new URL('../src/components/pages/games/five/FiveLobby.vue', import.meta.url), 'utf8'));
  const bindings = compileScript(descriptor, { id: 'five-lobby' }).bindings;
  const { code } = compile(pug.render(descriptor.template!.content, { doctype: 'html' }), { mode: 'function', prefixIdentifiers: true, bindingMetadata: bindings });
  expect(() => new Function('Vue', code)).not.toThrow();
});

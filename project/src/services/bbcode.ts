export interface BBNode { tag: string; value?: string; text?: string; children: BBNode[] }
const tags = new Set(['b', 'strong', 'i', 'u', 's', 'color', 'url', 'img', 'quote', 'list', '*', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code']);
export function decodeLegacyText(text: string): string {
  return text.replace(/&(quot|apos|lt|gt|amp|#039|#39|nbsp);/g, (_, entity) => ({ quot: '"', apos: "'", lt: '<', gt: '>', amp: '&', '#039': "'", '#39': "'", nbsp: '\u00a0' }[entity] ?? _));
}
export function safeBBUrl(value: string): string | undefined {
  const url = value.trim();
  if (/[\u0000-\u0020\u007f\\]/.test(url)) return;
  if (/^\/(?!\/)/.test(url)) return url;
  try { const parsed = new URL(url); if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password) return parsed.href; } catch { /* show the text without a link */ }
}
export function bbColor(value: string): string | undefined {
  return /^(#[a-f\d]{3,8}|[a-z]{1,20})$/i.test(value) ? value : undefined;
}
export function parseBBCode(input: string): BBNode[] {
  const text = decodeLegacyText(input.slice(0, 60000));
  const root: BBNode = { tag: 'root', children: [] };
  const stack = [root];
  const append = (value: string) => { if (value) stack[stack.length - 1].children.push({ tag: 'text', text: value, children: [] }); };
  const pattern = /\[(\/?)([a-z1-6*]+)([^\]]*)\]/gi;
  let from = 0, count = 0, match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) && count++ < 2000) {
    append(text.slice(from, match.index)); from = pattern.lastIndex;
    const tag = match[2].toLowerCase(), closing = !!match[1];
    if (!closing && ['br', 'hr'].includes(tag)) { stack[stack.length - 1].children.push({ tag, children: [] }); continue; }
    if (!tags.has(tag)) { append(match[0]); continue; }
    if (tag === '*' && stack[stack.length - 1].tag === '*') stack.pop();
    if (closing) {
      if (tag === 'list' && stack[stack.length - 1].tag === '*') stack.pop();
      if (stack.length > 1 && stack[stack.length - 1].tag === tag) stack.pop();
      else if (tag !== '*') append(match[0]);
      continue;
    }
    if (stack.length >= 32) { append(match[0]); continue; }
    const value = match[3].replace(/^=/, '').trim().replace(/^(["'])(.*)\1$/, '$2');
    const node: BBNode = { tag, value, children: [] };
    stack[stack.length - 1].children.push(node); stack.push(node);
  }
  append(text.slice(from));
  return root.children;
}

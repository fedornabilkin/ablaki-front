<script setup lang="ts">
import { computed, h, type VNodeChild } from 'vue';
import { parseBBCode, safeBBUrl, bbColor, type BBNode } from '@/services/bbcode';
const props = defineProps<{ text: string }>();
function plain(node: BBNode): string { return node.text ?? node.children.map(plain).join(''); }
function render(node: BBNode): VNodeChild {
  const children = () => node.children.map(render);
  if (node.tag === 'text') return node.text;
  if (node.tag === 'url') {
    const href = safeBBUrl(node.value || plain(node));
    return h(href ? 'a' : 'span', href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {}, children());
  }
  if (node.tag === 'img') {
    const src = safeBBUrl(plain(node));
    return src ? h('img', { src, alt: 'Изображение в сообщении', loading: 'lazy', referrerpolicy: 'no-referrer' }) : plain(node);
  }
  if (node.tag === 'quote') return h('blockquote', {}, [node.value ? h('cite', {}, node.value) : null, ...children()]);
  if (node.tag === 'color') return h('span', { style: { color: bbColor(node.value || '') } }, children());
  if (node.tag === 'list') return h(node.value === '1' ? 'ol' : 'ul', {}, children());
  if (node.tag === '*') return h('li', {}, children());
  if (node.tag === 'br' || node.tag === 'hr') return h(node.tag);
  const tag = ({ b: 'strong', i: 'em', code: 'code' } as Record<string, string>)[node.tag] || node.tag;
  return h(tag, {}, children());
}
const content = computed(() => parseBBCode(props.text).map(render));
const Content = () => content.value;
</script>
<template lang="pug">
.bbcode
  content
</template>
<style scoped>
.bbcode { white-space: pre-wrap; overflow-wrap: anywhere; }
.bbcode :deep(img) { max-width: 100%; max-height: 32rem; object-fit: contain; }
.bbcode :deep(blockquote) { border-left: 3px solid var(--primary); padding-left: .75rem; margin: .5rem 0; }
.bbcode :deep(cite) { display: block; color: var(--text-muted); }
.bbcode :deep(h1), .bbcode :deep(h2), .bbcode :deep(h3) { font-size: 1.2rem; }
</style>

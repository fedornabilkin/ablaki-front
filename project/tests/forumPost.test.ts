import { it, expect, vi } from 'vitest';
import { createSSRApp, h } from 'vue';
import { createStore } from 'vuex';
import { renderToString } from '@vue/server-renderer';
import ForumPost from '../src/components/pages/forum/ForumPost.vue';
import MessageComposer from '../src/components/MessageComposer.vue';
vi.mock('naive-ui', () => ({
  NButton: { inheritAttrs: true, setup: (_, { slots }) => () => h('button', slots.default?.()) },
  NAlert: { setup: (_, { slots }) => () => h('aside', slots.default?.()) },
  NTooltip: { setup: (_, { slots }) => () => h('span', [slots.trigger?.(), slots.default?.()]) },
  NInput: { setup: () => () => h('textarea') },
}));
vi.mock('../src/components/pages/forum/GiftUsers.vue', () => ({ default: { render: () => null } }));
vi.mock('../src/components/user/UserAvatar.vue', () => ({ default: { render: () => h('span', 'Author') } }));
const item = { id: 1, user_id: 2, user: { id: 2, username: 'Author' }, comment: '[b]Message[/b]', created_at: Math.floor(Date.now() / 1000) - 60, gift_count: 0, gifted_by_me: false };
async function renderPost(userId: number | null, changes = {}) {
  const app = createSSRApp({ render: () => h(ForumPost, { item: { ...item, ...changes }, giving: false }) });
  app.use(createStore({ state: { auth: { revision: 1 } }, getters: { 'auth/user': () => userId ? { id: userId } : null, 'auth/isAuthenticated': () => !!userId } }));
  return renderToString(app);
}
it('renders all three gift choices and formats message text', async () => {
  const html = await renderPost(1);
  for (const amount of [1, 2, 3]) expect(html).toContain('>+' + amount + '</button>');
  expect(html).toContain('<strong>Message</strong>');
  expect(html).not.toContain('Редактировать');
});
it('hides gift tags for existing donors, authors and guests', async () => {
  for (const html of [await renderPost(1, { gifted_by_me: true }), await renderPost(2), await renderPost(null)]) expect(html).not.toContain('gift-tags');
});
it('shows edit only to the author within ten minutes of publication', async () => {
  expect(await renderPost(2)).toContain('Редактировать');
  expect(await renderPost(2, { created_at: Math.floor(Date.now() / 1000) - 601 })).not.toContain('Редактировать');
  expect(await renderPost(2, { created_at: Math.floor(Date.now() / 1000) + 60 })).not.toContain('Редактировать');
});
it('places send, shortcut hint and microphone in that order', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(MessageComposer, { modelValue: 'Text', id: 'reply' }) }));
  expect(html.indexOf('>Отправить</button>')).toBeGreaterThan(-1);
  expect(html.indexOf('>Отправить</button>')).toBeLessThan(html.indexOf('Ctrl+Enter'));
  expect(html.indexOf('Ctrl+Enter')).toBeLessThan(html.indexOf('voice-button'));
  expect(html).toContain('<svg');
  expect(html).toContain('<textarea');
  expect(html).toContain('aria-describedby="reply-limit"');
  expect(html).toContain('4 / 3000');
  expect(html).not.toContain('autosize');
});

import { describe, expect, it } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createMemoryHistory, createRouter } from 'vue-router';
import UserList from '../src/components/user/UserList.vue';
import ForumThemeList from '../src/components/forum/ForumThemeList.vue';
import PagePager from '../src/components/PagePager.vue';

async function render(component: any, props: Record<string, unknown>, path = '/') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }] });
  await router.push(path);
  const app = createSSRApp({ render: () => h(component, props) });
  app.use(router);
  app.component('font-awesome-icon', { props: ['icon'], render() { return h('span', { 'data-icon': this.icon }); } });
  return renderToString(app);
}

describe('reusable community lists', () => {
  it('uses real encoded profile links and server presence, without marking offline users online', async () => {
    const html = await render(UserList, { users: [
      { id: 1, username: 'Member@one', is_online: true, person: { rating: 2 } },
      { id: 2, username: 'Offline', is_online: false, person: { rating: 0 } },
    ] });
    expect(html).toContain('href="/wall/Member%40one"');
    expect(html.match(/aria-label="В сети"/g)).toHaveLength(1);
    expect(html).toContain('data-icon="star"');
    expect(html).toContain('Рейтинг: 0');
  });
  it('renders topic counters and copyable topic links', async () => {
    const html = await render(ForumThemeList, { themes: [{ id: 7, title: 'Тема', comment_count: 0, view: 42 }] });
    expect(html).toContain('href="/forum/read/7"');
    expect(html).toContain('Комментарии: 0');
    expect(html).toContain('Просмотры: 42');
  });
  it('keeps independent list state in pagination hrefs', async () => {
    const html = await render(PagePager, { page: 2, queryPrefix: 'recent', result: { items: [], total: 50, pageSize: 20, currentPage: 2 } }, '/games/orel?page=4&recent_page=2&recent_kon=5');
    expect(html).toContain('href="/games/orel?page=4&amp;recent_kon=5"');
    expect(html).toContain('href="/games/orel?page=4&amp;recent_page=3&amp;recent_kon=5"');
    expect(html).toContain('rel="next"');
  });
});

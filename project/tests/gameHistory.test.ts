import { describe, expect, it } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createRequire } from 'node:module';
import { faStar, faTrophy } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import GameHistoryList from '../src/components/pages/games/GameHistoryList.vue';
import { historyWinner, historyPlayer, historyCompletedAt, historyTime, type HistoryGameKind } from '../src/services/api/gameHistory';
import { routes } from '../src/routes';

const game = { id: 3, user_id: 1, user_gamer: 2, username: 'Alice', username_gamer: 'Bob', kon: 5, created_at: 1, updated_at: 1704067200 };
// The Node SSR entry of vue-fontawesome uses the CommonJS core instance.
createRequire(import.meta.url)('@fortawesome/fontawesome-svg-core').library.add(faStar, faTrophy);
async function render(kind: HistoryGameKind, fields = {}) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:path(.*)*', component: { template: '<div />' } }] });
  await router.push('/games/' + kind + '/history');
  const app = createSSRApp(GameHistoryList, { kind, games: [{ ...game, ...fields }] });
  app.use(router); app.component('font-awesome-icon', FontAwesomeIcon);
  return renderToString(app);
}

describe('shared game history', () => {
  it.each(['orel', 'saper'] as const)('marks the actual winner for %s regardless of the viewing account', kind => {
    expect(historyWinner({ ...game, win: true }, kind)).toBe('player');
    expect(historyWinner({ ...game, win: false }, kind)).toBe('creator');
    expect(historyWinner({ ...game, win: 'false' }, kind)).toBeNull();
  });
  it('handles duel/five outcomes and never awards a cup for a draw or active game', () => {
    expect(historyWinner({ ...game, result: 'user' }, 'duel')).toBe('creator');
    expect(historyWinner({ ...game, result: 'gamer' }, 'duel')).toBe('player');
    expect(historyWinner({ ...game, result: 'draw' }, 'duel')).toBe('draw');
    expect(historyWinner({ ...game, status: 'user' }, 'five')).toBe('creator');
    expect(historyWinner({ ...game, status: 'gamer' }, 'five')).toBe('player');
    expect(historyWinner({ ...game, status: 'play' }, 'five')).toBeNull();
  });
  it('uses completion timestamps, respects explicit nulls, and never substitutes creation time', () => {
    expect(historyCompletedAt({ ...game, time_over_at: 123 }, 'saper')).toBe(123);
    expect(historyCompletedAt(game, 'duel')).toBe(1704067200);
    expect(historyCompletedAt({ ...game, completed_at: null }, 'orel')).toBeNull();
    expect(historyCompletedAt({ id: 1, created_at: 123 }, 'five')).toBeNull();
    expect(historyTime(1704067200)).toContain('03:00:00');
    for (const completed_at of [false, '', -1, Infinity, 'broken']) expect(historyCompletedAt({ ...game, completed_at }, 'orel')).toBeNull();
  });
  it('does not invent a rating or a link for a missing player', () => {
    expect(historyPlayer(game, 'creator')).toEqual({ id: 1, username: 'Alice' });
    expect(historyPlayer({ ...game, username_gamer: null }, 'player')).toBeNull();
  });
  it.each([
    ['orel', { win: true }, 'Игрок'], ['saper', { win: false, completed_at: 1704067200 }, 'Создатель'],
    ['duel', { result: 'user' }, 'Создатель'], ['five', { status: 'gamer' }, 'Игрок'],
  ] as const)('renders stake, both UserAvatars, completion time and one trophy for %s', async (kind, fields, winner) => {
    const html = await render(kind, fields);
    expect(html).toContain('<table'); expect(html).toContain('<thead');
    expect(html).toContain('Ставка</th>'); expect(html).toContain(kind === 'saper' ? '5 Кг' : '5 Cr');
    expect(html).toContain('href="/wall/Alice"'); expect(html).toContain('href="/wall/Bob"');
    expect(html.match(/class="user-avatar"/g)).toHaveLength(2);
    expect(html.match(/data-icon="trophy"/g)).toHaveLength(1);
    expect(html).toContain(winner + ': победитель');
    expect(html).toContain('2024-01-01T00:00:00.000Z');
    expect(html).toContain('03:00:00'); expect(html).toContain('01.01.2024</span>');
  });
  it('renders draws and deleted players without a false winning avatar', async () => {
    const draw = await render('duel', { result: 'draw' });
    expect(draw).toContain('Ничья'); expect(draw).not.toContain('data-icon="trophy"');
    const missing = await render('orel', { username_gamer: null, win: null, completed_at: null });
    expect(missing).toContain('Участник недоступен'); expect(missing).not.toContain('/wall/null');
    expect(missing).not.toContain('data-icon="trophy"');
  });
  it('passes complete profiles to UserAvatar and renders the server rating', async () => {
    const creator = { id: 1, username: 'Alice', is_online: true, person: { rating: 42.5, description: 'Profile' } };
    expect(historyPlayer({ ...game, creator }, 'creator')).toEqual(creator);
    const html = await render('orel', { creator, win: false });
    expect(html).toContain('42,5'); expect(html).toContain('data-icon="star"');
  });
  it('has an authenticated history route for every game', () => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    for (const kind of ['orel', 'saper', 'duel', 'five']) {
      const route = router.resolve(`/games/${kind}/history`);
      expect(route.matched.some(record => record.meta.requiresAuth)).toBe(true);
      expect(route.matched.some(record => record.path.includes('rest'))).toBe(false);
    }
  });
});

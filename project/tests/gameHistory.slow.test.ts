// @module-tag slow
// Broad component/rendering checks: use test:slow or test:full.
import FiveBoard from '../src/components/pages/games/five/FiveBoard.vue';
import { fiveGame } from '../src/services/api/fiveGame';
import { vi } from 'vitest';
import { describe, expect, it } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createRequire } from 'node:module';
import { faStar, faTrophy } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import GameHistoryList from '../src/components/pages/games/GameHistoryList.vue';
import { historyPlayer, type HistoryGameKind } from '../src/services/api/gameHistory';

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

  it.each([
    ['orel', { win: true }, 'Игрок'], ['saper', { win: false, completed_at: 1704067200 }, 'Создатель'],
    ['duel', { result: 'user' }, 'Создатель'], ['five', { status: 'gamer' }, 'Игрок'],
  ] as const)('renders stake, both UserAvatars, completion time and one trophy for %s', async (kind, fields, winner) => {
    const html = await render(kind, fields);
    expect(html).toContain('<table'); expect(html).toContain('<thead');
    expect(html).toContain('Ставка</th>'); expect(html).toContain(kind === 'saper' ? '5 Кг' : 'aria-label="5 кредитов"');
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

});

const fiveDto = { id: 1, user_id: 1, user_gamer: 0, creator: { id: 1, username: 'Creator', person: { rating: 12.5 } },
  kon: '10', bank: '20', commission: '1', winner_amount: '19', status: 'free', turn: 'gamer', user_points: 0, gamer_points: 0,
  last_hod: { id: 7, status: 'wait', gamer_ball: 0, user_amount: 0, gamer_amount: 0 } };
vi.mock('naive-ui', async importOriginal => ({ ...await importOriginal<typeof import('naive-ui')>(), NPopconfirm: { template: '<div><slot name="trigger" /></div>' } }));
describe('five-game rendering', () => {
  it('renders five-game controls for the creator and opponent', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }] });
    const render = async (userId: number, data = fiveDto) => {
      const app = createSSRApp(FiveBoard, { game: fiveGame(data), userId, credit: 100, busy: false, blocked: false });
      app.use(router); app.component('font-awesome-icon', { template: '<span />' });
      return renderToString(app);
    };
    const guest = await render(2);
    expect(guest).toContain('Победителю:'); expect(guest).toContain('aria-label="19 кредитов"'); expect(guest).toContain('Число яблок'); expect(guest).toContain('/wall/Creator');
    expect(guest).not.toContain('Ваш скрытый ход');
    const creator = await render(1, { ...fiveDto, last_hod: { ...fiveDto.last_hod, user_ball: 4 } } as typeof fiveDto);
    expect(creator).toContain('Ваш скрытый ход: 4'); expect(creator).toContain('Отменить игру'); expect(creator).not.toContain('Число яблок');
  });
});

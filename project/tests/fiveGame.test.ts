import { describe, expect, it, vi } from 'vitest';
import { fiveGame, fiveRole, canMoveFive, moveFive, createFive, cancelFive } from '../src/services/api/fiveGame';
import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createMemoryHistory, createRouter } from 'vue-router';
import FiveBoard from '../src/components/pages/games/five/FiveBoard.vue';
import { routes } from '../src/routes';
const client = vi.hoisted(() => ({ post: vi.fn(), delete: vi.fn() }));
vi.mock('../src/services/httpClient', () => ({ apiClient: client }));
// Popup positioning requires a browser; render its trigger while testing the board's real controls.
vi.mock('naive-ui', async importOriginal => ({ ...await importOriginal<typeof import('naive-ui')>(), NPopconfirm: { template: '<div><slot name="trigger" /></div>' } }));
export const dto = { id: 1, user_id: 1, user_gamer: 0, creator: { id: 1, username: 'Creator', person: { rating: 12.5 } },
  kon: '10', bank: '20', commission: '1', winner_amount: '19', status: 'free', turn: 'gamer', user_points: 0, gamer_points: 0,
  last_hod: { id: 7, status: 'wait', gamer_ball: 0, user_amount: 0, gamer_amount: 0 } };
describe('5 apples API contract', () => {
  it('connects all game pages under authentication and renders role-specific controls', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    for (const path of ['/games/five', '/games/five/my', '/games/five/history']) {
      const route = router.resolve(path);
      expect(route.meta.requiresAuth).toBe(true); expect(route.matched[0].path).not.toContain('rest');
    }
    const render = async (userId: number, data = dto) => {
      const app = createSSRApp(FiveBoard, { game: fiveGame(data), userId, credit: 100, busy: false, blocked: false });
      app.use(router); app.component('font-awesome-icon', { template: '<span />' });
      return renderToString(app);
    };
    const guest = await render(2);
    expect(guest).toContain('Победителю: 19 Cr'); expect(guest).toContain('Число яблок'); expect(guest).toContain('/wall/Creator');
    expect(guest).not.toContain('Ваш скрытый ход');
    const creator = await render(1, { ...dto, last_hod: { ...dto.last_hod, user_ball: 4 } } as typeof dto);
    expect(creator).toContain('Ваш скрытый ход: 4'); expect(creator).toContain('Отменить игру'); expect(creator).not.toContain('Число яблок');
  });
  it('uses server amounts, role, turn and balance without guessing hidden moves', () => {
    const game = fiveGame(dto);
    expect(game.winner_amount).toBe(19); expect(game.last_hod?.user_ball).toBeUndefined();
    expect(fiveRole(game, 1)).toBe('user'); expect(fiveRole(game, 3)).toBeNull();
    expect(canMoveFive(game, 1, 100)).toBe(false); expect(canMoveFive(game, 2, 9)).toBe(false); expect(canMoveFive(game, 2, 10)).toBe(true);
    const active = fiveGame({ ...dto, user_gamer: 2, status: 'play', turn: 'user' });
    expect(canMoveFive(active, 1, 0)).toBe(true); expect(canMoveFive(active, 2, 100)).toBe(false); expect(canMoveFive(active, 3, 100)).toBe(false);
    expect(canMoveFive(fiveGame({ ...dto, status: 'user', turn: null, last_hod: null }), 1, 100)).toBe(false);
  });
  it('sends the observed round token with a move and never uses a mock', async () => {
    client.post.mockResolvedValue({ data: { game: dto } });
    await moveFive(fiveGame(dto), 5);
    expect(client.post.mock.calls.at(-1)).toEqual([expect.stringContaining('/v1/five/play/1'), { ball: 5, round_id: 7 }]);
    client.post.mockResolvedValueOnce({ data: dto }); await createFive(10, 4);
    expect(client.post.mock.calls.at(-1)?.[1]).toEqual({ kon: 10, ball: 4 });
    client.delete.mockResolvedValueOnce({ data: '' }); await cancelFive(1);
    expect(client.delete).toHaveBeenCalledWith(expect.stringContaining('/v1/five/1'));
  });
  it('rejects malformed data and HTTP-200 validation failures', async () => {
    for (const data of [null, { ...dto, winner_amount: false }, { ...dto, winner_amount: 20 }, { ...dto, status: 'mock' }, { ...dto, status: 'play', last_hod: null }]) expect(() => fiveGame(data)).toThrow('invalid-response');
    client.post.mockResolvedValueOnce({ data: { errors: { ball: ['Invalid'] } } });
    await expect(moveFive(fiveGame(dto), 5)).rejects.toThrow('validation-response');
  });
});

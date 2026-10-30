import { describe, expect, it, vi } from 'vitest';
import { fiveGame, fiveRole, canMoveFive, moveFive, createFive, cancelFive } from '../src/services/api/fiveGame';
const client = vi.hoisted(() => ({ post: vi.fn(), delete: vi.fn() }));
vi.mock('../src/services/httpClient', () => ({ apiClient: client }));
const dto = { id: 1, user_id: 1, user_gamer: 0, creator: { id: 1, username: 'Creator', person: { rating: 12.5 } },
  kon: '10', bank: '20', commission: '1', winner_amount: '19', status: 'free', turn: 'gamer', user_points: 0, gamer_points: 0,
  last_hod: { id: 7, status: 'wait', gamer_ball: 0, user_amount: 0, gamer_amount: 0 } };
describe('5 apples API contract', () => {

  it('uses server amounts, role, turn and balance without guessing hidden moves', () => {
    const game = fiveGame(dto);
    expect(game.winner_amount).toBe(19); expect(game.last_hod?.user_ball).toBeUndefined();
    expect(fiveRole(game, 1)).toBe('user'); expect(fiveRole(game, 3)).toBeNull();
    expect(canMoveFive(game, 1, 100)).toBe(false); expect(canMoveFive(game, 2, 9)).toBe(false); expect(canMoveFive(game, 2, 10)).toBe(true);
    const active = fiveGame({ ...dto, user_gamer: 2, status: 'play', turn: 'user' });
    expect(canMoveFive(active, 1, 0)).toBe(true); expect(canMoveFive(active, 2, 100)).toBe(false); expect(canMoveFive(active, 3, 100)).toBe(false);
    const ready = fiveGame({ ...dto, user_gamer: 2, status: 'play', turn: null, last_hod: { ...dto.last_hod, status: 'user', user_ball: 4, gamer_ball: 5 } });
    expect(canMoveFive(ready, 1, 0)).toBe(true); expect(canMoveFive(ready, 2, 0)).toBe(true);
    const opponentFirst = fiveGame({ ...dto, user_gamer: 2, status: 'play', turn: 'user', last_hod: { ...dto.last_hod, gamer_ball: 5 } });
    expect(canMoveFive(opponentFirst, 1, 0)).toBe(true); expect(canMoveFive(opponentFirst, 2, 100)).toBe(false);
    expect(canMoveFive(fiveGame({ ...dto, status: 'user', turn: null, last_hod: null }), 1, 100)).toBe(false);
  });
  it('sends the observed round token with a move and never uses a mock', async () => {
    client.post.mockResolvedValue({ data: { game: dto } });
    await moveFive(fiveGame(dto), 5);
    expect(client.post.mock.calls.at(-1)).toEqual([expect.stringContaining('/v1/five/play/1'), { ball: 5, round_id: 7, round_status: 'wait' }]);
    client.post.mockResolvedValueOnce({ data: dto }); await createFive(10, 4);
    expect(client.post.mock.calls.at(-1)?.[1]).toEqual({ kon: 10, ball: 4 });
    client.post.mockResolvedValueOnce({ data: { count: 2, game: dto } }); await createFive(10, 4, 2);
    expect(client.post.mock.calls.at(-1)?.[1]).toEqual({ kon: 10, ball: 4, count: 2 });
    client.delete.mockResolvedValueOnce({ data: '' }); await cancelFive(1);
    expect(client.delete).toHaveBeenCalledWith(expect.stringContaining('/v1/five/1'));
  });
  it('rejects malformed data and HTTP-200 validation failures', async () => {
    for (const data of [null, { ...dto, winner_amount: false }, { ...dto, winner_amount: 20 }, { ...dto, status: 'mock' }, { ...dto, status: 'play', last_hod: null }]) expect(() => fiveGame(data)).toThrow('invalid-response');
    client.post.mockResolvedValueOnce({ data: { errors: { ball: ['Invalid'] } } });
    await expect(moveFive(fiveGame(dto), 5)).rejects.toThrow('validation-response');
  });
});

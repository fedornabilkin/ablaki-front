import { describe, expect, it } from 'vitest';
import { playerOutcome, summaryData, winnerName } from '@/services/api/gameOverview';

describe('game outcomes', () => {
  const game = { id: 9, user_id: 1, user_gamer: 2, username: 'creator', username_gamer: 'player', win: true };
  it('gives the crown to the winner and reverses the result for the creator', () => {
    expect(winnerName(game)).toBe('player');
    expect(playerOutcome(game, { id: 2 })).toBe('Победа');
    expect(playerOutcome(game, { id: 1 })).toBe('Поражение');
    expect(winnerName({ ...game, win: false })).toBe('creator');
    expect(playerOutcome({ ...game, win: false }, { id: 1 })).toBe('Победа');
  });
  it('does not infer an outcome for an unfinished game or nonparticipant', () => {
    expect(winnerName({ ...game, win: null })).toBeNull();
    expect(winnerName({ ...game, win: 'false' })).toBeNull();
    expect(playerOutcome(game, { id: 3 })).toBe('Нет результата');
    expect(playerOutcome({ ...game, win: null }, { id: 1 })).toBe('Нет результата');
    expect(winnerName({ ...game, username_gamer: null })).toBeNull();
  });
  it('uses identity rather than a coincidentally equal username and supports legacy DTOs', () => {
    expect(playerOutcome(game, { id: 3, username: 'player' })).toBe('Нет результата');
    expect(playerOutcome({ id: 9, username: 'creator', username_gamer: 'player', win: false }, { username: 'player' })).toBe('Поражение');
  });
});

describe('game summary boundary', () => {
  const summary = { today: { played: 3, wins: 1, balance: '-12.75', date: '2026-09-05', timezone: 'Europe/Moscow' }, own: { count: 2, amount: '20.00' } };
  it('keeps signed server ledger totals and accepts numeric database strings', () => {
    expect(summaryData(summary)).toEqual({ ...summary, today: { ...summary.today, balance: -12.75 }, own: { count: 2, amount: 20 } });
  });
  it('rejects absent data and impossible aggregates instead of displaying fake zeroes', () => {
    for (const value of [null, {}, { ...summary, today: { ...summary.today, wins: 4 } }, { ...summary, own: { count: 1, amount: -2 } }, { ...summary, today: { ...summary.today, balance: null } }, { ...summary, today: { ...summary.today, played: 1.5 } }]) {
      expect(() => summaryData(value)).toThrow('invalid-response');
    }
  });
});

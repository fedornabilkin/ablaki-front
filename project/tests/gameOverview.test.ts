import { historyWinner, historyPlayer, historyCompletedAt, historyTime } from '../src/services/api/gameHistory';
import { describe, expect, it } from 'vitest';
import { overviewSnapshot, playerOutcome, summaryData, winnerName } from '@/services/api/gameOverview';

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
  it('decodes the overview included in a completed play response', () => {
    expect(overviewSnapshot({ overview: { summary, recent: [{ id: '9', kon: 5 }] } })).toEqual({
      summary: summaryData(summary), recent: [{ id: 9, kon: 5 }],
    });
    expect(overviewSnapshot({ game: { id: 9 } })).toBeNull();
    expect(() => overviewSnapshot({ overview: { summary, recent: [{}] } })).toThrow('invalid-response');
  });
});

const game = { id: 3, user_id: 1, user_gamer: 2, username: 'Alice', username_gamer: 'Bob', kon: 5, created_at: 1, updated_at: 1704067200 };
describe('game history projection', () => {
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
});

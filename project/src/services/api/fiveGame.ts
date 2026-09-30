import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { checkMutation, record, type RecordData } from './portal';

export type FiveRole = 'user' | 'gamer';
export interface FiveRound extends RecordData { status: 'wait' | 'draw' | FiveRole; user_ball?: number; gamer_ball?: number; user_amount: number; gamer_amount: number; }
export interface FiveGame extends RecordData {
  user_id: number; user_gamer: number; kon: number; bank: number; commission: number; winner_amount: number;
  status: 'free' | 'play' | FiveRole; turn: FiveRole | null; user_points: number; gamer_points: number; last_hod: FiveRound | null; rounds: FiveRound[];
}
function numeric(value: unknown, min = 0, integer = false): number {
  if (!['number', 'string'].includes(typeof value) || !String(value).trim()) throw new Error('invalid-response');
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || (integer && !Number.isSafeInteger(number))) throw new Error('invalid-response');
  return number;
}
export function fiveGame(value: unknown): FiveGame {
  const data = record(value);
  if (!['free', 'play', 'user', 'gamer'].includes(String(data.status)) || !['user', 'gamer', null].includes(data.turn as FiveRole | null)) throw new Error('invalid-response');
  const parseRound = (value: unknown): FiveRound => {
    const hod = record(value);
    if (!['wait', 'draw', 'user', 'gamer'].includes(String(hod.status))) throw new Error('invalid-response');
    const user_ball = hod.user_ball == null ? undefined : numeric(hod.user_ball, 1, true);
    const gamer_ball = hod.gamer_ball == null ? undefined : numeric(hod.gamer_ball, 0, true);
    if ((user_ball ?? 1) > 5 || (gamer_ball ?? 1) > 5) throw new Error('invalid-response');
    return { ...hod, status: hod.status as FiveRound['status'], user_ball, gamer_ball,
      user_amount: numeric(hod.user_amount, 0, true), gamer_amount: numeric(hod.gamer_amount, 0, true) };
  };
  const last_hod = data.last_hod == null ? null : parseRound(data.last_hod);
  const rounds = Array.isArray(data.rounds) ? data.rounds.map(parseRound) : [];
  if (rounds.some(round => round.status === 'wait' || !round.user_ball || !round.gamer_ball)) throw new Error('invalid-response');
  const game = { ...data, user_id: numeric(data.user_id, 1, true), user_gamer: numeric(data.user_gamer, 0, true),
    kon: numeric(data.kon, 1), bank: numeric(data.bank), commission: numeric(data.commission), winner_amount: numeric(data.winner_amount),
    status: data.status as FiveGame['status'], turn: data.turn as FiveGame['turn'], user_points: numeric(data.user_points, 0, true), gamer_points: numeric(data.gamer_points, 0, true), last_hod, rounds };
  if (Math.abs(game.bank - game.commission - game.winner_amount) > .001 || (game.status === 'play' && !last_hod)) throw new Error('invalid-response');
  return game;
}
export const fiveRole = (game: FiveGame, userId: number): FiveRole | null => game.user_id === userId ? 'user' : game.user_gamer === userId ? 'gamer' : null;
export const fiveFinished = (game: FiveGame) => game.status === 'user' || game.status === 'gamer';
export function canMoveFive(game: FiveGame, userId: number, credit: number): boolean {
  const role = fiveRole(game, userId);
  return !!game.last_hod && (game.status === 'free' ? game.user_id !== userId && credit >= game.kon : game.status === 'play' && !!role && (game.turn === null || game.turn === role));
}
const url = (path = '') => config.makeApiUrl(`v1/five${path}`);
export async function loadFive(id: number): Promise<FiveGame> { return fiveGame((await apiClient.get(url(`/${id}`), { params: { expand: 'rounds' } })).data); }
export async function createFive(kon: number, ball: number, count = 1): Promise<FiveGame | null> {
  const data = checkMutation((await apiClient.post(url(), count === 1 ? { kon, ball } : { kon, ball, count })).data);
  if (count > 1) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || !('count' in data) || numeric(data.count, 1, true) !== count) throw new Error('invalid-response');
    return null;
  }
  return fiveGame(data);
}
export async function moveFive(game: FiveGame, ball: number): Promise<FiveGame> {
  if (!game.last_hod) throw new Error('invalid-response');
  const data = checkMutation((await apiClient.post(url(`/play/${game.id}`), { ball, round_id: game.last_hod.id })).data);
  if (!data || typeof data !== 'object' || !('game' in data)) throw new Error('invalid-response');
  return fiveGame(data.game);
}
export async function cancelFive(id: number): Promise<void> { checkMutation((await apiClient.delete(url(`/${id}`))).data); }

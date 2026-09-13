import type { RecordData } from './portal';

export type HistoryGameKind = 'orel' | 'saper' | 'duel' | 'five';
export type GameSide = 'creator' | 'player';

export function historyWinner(game: RecordData, kind: HistoryGameKind): GameSide | 'draw' | null {
  if (kind === 'duel' || kind === 'five') {
    const result = kind === 'duel' ? game.result : game.status;
    if (result === 'user') return 'creator';
    if (result === 'gamer') return 'player';
    return kind === 'duel' && result === 'draw' ? 'draw' : null;
  }
  return typeof game.win === 'boolean' ? (game.win ? 'player' : 'creator') : null;
}

export function historyPlayer(game: RecordData, side: GameSide): RecordData | null {
  const nested = game[side];
  const data = nested && typeof nested === 'object' && !Array.isArray(nested) ? nested as Record<string, unknown> : null;
  const username = data?.username ?? game[side === 'creator' ? 'username' : 'username_gamer'];
  if (typeof username !== 'string' || !username.trim()) return null;
  const id = Number(data?.id ?? game[side === 'creator' ? 'user_id' : 'user_gamer']);
  // Legacy game DTOs only contain names/ids. Do not invent a rating or online status.
  return { ...data, id: Number.isSafeInteger(id) && id > 0 ? id : 0, username: username.trim() };
}

export function historyCompletedAt(game: RecordData, kind: HistoryGameKind): number | null {
  const value = 'completed_at' in game ? game.completed_at : kind === 'saper' ? game.time_over_at : game.updated_at;
  if ((typeof value !== 'number' && typeof value !== 'string') || !String(value).trim()) return null;
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 && !Number.isNaN(new Date(timestamp * 1000).getTime()) ? timestamp : null;
}

export function historyTime(timestamp: number | null): string {
  return timestamp === null ? '—' : new Date(timestamp * 1000).toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

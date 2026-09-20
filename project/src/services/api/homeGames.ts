import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { record, type RecordData } from './portal';
import type { HistoryGameKind } from './gameHistory';
export async function homeRecentGames(kind: HistoryGameKind): Promise<RecordData[]> {
  const { data } = await apiClient.get(config.makeApiUrl('v1/stat/recent-games'), { params: { kind } });
  if (!Array.isArray(data) || data.length > 3) throw new Error('invalid-response');
  return data.map(value => {
    const game = record(value);
    if (!['creator', 'player', 'draw', null].includes(game.winner as string | null) || !Number.isFinite(Number(game.kon)) || Number(game.kon) <= 0) throw new Error('invalid-response');
    return game;
  });
}
